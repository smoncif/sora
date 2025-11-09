import { NextRequest, NextResponse } from 'next/server';
import { getValidationLinkData } from 'lib/services/validation/validationLinkService';

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
    const limit = Math.min(Math.max(limitParam, 1), 50); // sécurité

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
      (entry: any) =>
        entry?.roleId === roleId || entry?.roleName === roleId
    );

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Rôle simple introuvable' },
        { status: 404 }
      );
    }

    const previewTransactions = Array.isArray(role.previewTransactions)
      ? role.previewTransactions
      : [];
    const remainingTransactions = Array.isArray(role.remainingTransactions)
      ? role.remainingTransactions
      : [];
    const totalTransactions =
      typeof role.totalTransactions === 'number'
        ? role.totalTransactions
        : previewTransactions.length + remainingTransactions.length;

    const slice = remainingTransactions.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;
    const hasMore = nextOffset < remainingTransactions.length;

    return NextResponse.json({
      success: true,
      data: {
        transactions: slice,
        nextOffset,
        hasMore,
        totalTransactions,
        previewCount: previewTransactions.length,
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

