import { NextRequest, NextResponse } from 'next/server';
import { getValidationLinkData } from 'lib/services/validation/validationLinkService';
import { createClient } from 'lib/utils/supabase/server';

interface ModuleHierarchyData {
  module?: string;
  moduleDescription?: string;
  level1Module?: string;
  level1Description?: string;
  level2Module?: string;
  level2Description?: string;
  level3Module?: string;
  level3Description?: string;
}

async function fetchModulesWithHierarchy(
  transactionCodes: string[]
): Promise<Map<string, ModuleHierarchyData>> {
  const resultMap = new Map<string, ModuleHierarchyData>();
  if (transactionCodes.length === 0) {
    return resultMap;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      transaction,
      modules:module_id (
        module,
        description
      )
    `)
    .in('transaction', transactionCodes);

  if (error) {
    console.error('[API] validation transactions: erreur récupération modules', error);
    return resultMap;
  }

  const moduleIds = new Set<string>();
  data?.forEach((item: any) => {
    const moduleId = item?.modules?.module;
    if (!moduleId) {
      return;
    }
    moduleIds.add(moduleId);
    const parts = moduleId.split('-');
    if (parts.length >= 1) {
      moduleIds.add(parts[0]);
    }
    if (parts.length >= 2) {
      moduleIds.add(`${parts[0]}-${parts[1]}`);
    }
  });

  const { data: modulesData, error: modulesError } = await supabase
    .from('modules')
    .select('module, description')
    .in('module', Array.from(moduleIds));

  if (modulesError) {
    console.error('[API] validation transactions: erreur descriptions modules', modulesError);
  }

  const moduleDescriptions = new Map<string, string>();
  modulesData?.forEach((module: any) => {
    moduleDescriptions.set(module.module, module.description);
  });

  data?.forEach((item: any) => {
    const moduleId: string | undefined = item?.modules?.module;
    if (!moduleId) {
      return;
    }
    const parts = moduleId.split('-');
    const level1Module = parts.length >= 1 ? parts[0] : undefined;
    const level2Module = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : undefined;
    const level3Module = parts.length >= 3 ? moduleId : undefined;

    resultMap.set(item.transaction, {
      module: moduleId,
      moduleDescription: item.modules?.description,
      level1Module,
      level1Description: level1Module ? moduleDescriptions.get(level1Module) : undefined,
      level2Module,
      level2Description: level2Module ? moduleDescriptions.get(level2Module) : undefined,
      level3Module,
      level3Description: level3Module ? moduleDescriptions.get(level3Module) : undefined,
    });
  });

  return resultMap;
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ token: string; businessRole: string; roleId: string }>;
  }
) {
  try {
    const { token, businessRole, roleId } = await params;

    const searchParams = request.nextUrl.searchParams;
    const offset = Math.max(0, Number.parseInt(searchParams.get('offset') ?? '0', 10));
    const limitParam = Number.parseInt(searchParams.get('limit') ?? '10', 10);
    const limit = Math.min(Math.max(limitParam, 1), 50);
    const includePreview = searchParams.get('includePreview') === 'true';
    const sortFieldParam = searchParams.get('sortField') ?? 'transaction';
    const sortDirectionParam = searchParams.get('sortDirection') ?? 'asc';

    const allowedSortFields = new Set(['level1', 'level2', 'level3Plus', 'transaction', 'usage']);
    const sortField = allowedSortFields.has(sortFieldParam) ? sortFieldParam : 'transaction';
    const sortDirection = sortDirectionParam === 'desc' ? 'desc' : 'asc';

    const link = await getValidationLinkData(token, { includeFullTransactions: true });
    if (!link?.payload?.selectedRolesData) {
      return NextResponse.json(
        { success: false, error: 'Validation introuvable' },
        { status: 404 }
      );
    }

    const rolesForBusinessRole = link.payload.selectedRolesData[businessRole];
    if (!Array.isArray(rolesForBusinessRole)) {
      return NextResponse.json(
        { success: false, error: 'Rôle métier introuvable' },
        { status: 404 }
      );
    }

    const role = rolesForBusinessRole.find(
      (entry: any) => entry?.roleId === roleId || entry?.roleName === roleId
    );

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Rôle simple introuvable' },
        { status: 404 }
      );
    }

    const transactionCodes = Array.isArray(role.transactionCodes)
      ? role.transactionCodes.filter((code: unknown): code is string => typeof code === 'string')
      : [];
    const transactionDescriptions =
      typeof role.transactionDescriptions === 'object' && role.transactionDescriptions !== null
        ? (role.transactionDescriptions as Record<string, string>)
        : {};
    const transactionUsage =
      typeof role.transactionUsage === 'object' && role.transactionUsage !== null
        ? (role.transactionUsage as Record<string, number>)
        : {};
    const previewCount =
      typeof role.previewTransactions === 'object' && Array.isArray(role.previewTransactions)
        ? role.previewTransactions.length
        : Math.min(5, transactionCodes.length);
    const totalTransactions = transactionCodes.length;

    const modulesMapAll = await fetchModulesWithHierarchy(transactionCodes);

    const getSortValue = (code: string) => {
      const moduleData = modulesMapAll.get(code);
    const moduleKey = moduleData?.module ?? '';
    switch (sortField) {
      case 'level1': {
        const level1 = moduleData?.level1Module ?? '';
        const level2 = moduleData?.level2Module ?? '';
        const level3 = moduleData?.module ?? '';
        return `${level1}||${level2}||${level3}||${code}`;
      }
      case 'level2': {
        const level1 = moduleData?.level1Module ?? '';
        const level2 = moduleData?.level2Module ?? '';
        const level3 = moduleData?.module ?? '';
        return `${level2}||${level1}||${level3}||${code}`;
      }
      case 'level3Plus':
        return `${moduleKey}||${transactionDescriptions[code] ?? ''}||${code}`;
      case 'usage': {
        const usage = transactionUsage[code] ?? 0;
        return usage;
      }
      case 'transaction':
      default:
        return code;
    }
    };

    const sortedCodes = [...transactionCodes].sort((a, b) => {
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);

    if (typeof valueA === 'number' || typeof valueB === 'number') {
      const numA = typeof valueA === 'number' ? valueA : transactionUsage[a] ?? 0;
      const numB = typeof valueB === 'number' ? valueB : transactionUsage[b] ?? 0;
      return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

    const stringA = String(valueA);
    const stringB = String(valueB);
      const comparison = stringA.localeCompare(stringB, 'fr', { sensitivity: 'base' });
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    const remainingCodes = sortedCodes.slice(previewCount);

    let sliceCodes: string[] = [];
    let nextOffset = offset;

    if (includePreview) {
      const maxCount = Math.min(limit, sortedCodes.length);
      sliceCodes = sortedCodes.slice(0, maxCount);
      nextOffset = Math.max(sliceCodes.length - previewCount, 0);
    } else {
      sliceCodes = remainingCodes.slice(offset, offset + limit);
      nextOffset = offset + sliceCodes.length;
    }

    const hasMore = nextOffset < remainingCodes.length;

    const transactions = sliceCodes.map((code) => {
      const moduleData = modulesMapAll.get(code);
      return {
        code,
        description:
          typeof transactionDescriptions[code] === 'string'
            ? transactionDescriptions[code]
            : code,
        usage:
          typeof transactionUsage[code] === 'number'
            ? transactionUsage[code]
            : 0,
        module: moduleData?.module,
        moduleDescription: moduleData?.moduleDescription,
        level1Module: moduleData?.level1Module,
        level1Description: moduleData?.level1Description,
        level2Module: moduleData?.level2Module,
        level2Description: moduleData?.level2Description,
        level3Module: moduleData?.level3Module,
        level3Description: moduleData?.level3Description,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        nextOffset,
        hasMore,
        totalTransactions,
        previewCount,
        sortField,
        sortDirection,
      },
    });
  } catch (error) {
    console.error('[API] validation transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erreur lors de la récupération des transactions',
      },
      { status: 500 }
    );
  }
}

