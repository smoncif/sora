import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LicenseType } from 'lib/types/roleAnalysis';

// Vérification des permissions admin
async function checkAdminPermissions(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    throw new Error('Token d\'authentification manquant');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: user, error: userError } = await supabase.auth.getUser(token);
  
  if (userError || !user.user) {
    throw new Error('Token d\'authentification invalide');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.user.id)
    .single();

  if (profileError || profile?.role?.toLowerCase() !== 'admin') {
    throw new Error('Droits administrateur requis');
  }

  return { supabase, userId: user.user.id };
}

// GET - Récupérer tous les types de licences
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await checkAdminPermissions(request);

    const { data: licenseTypes, error } = await supabase
      .from('license_types')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
  
      return NextResponse.json(
        { error: 'Failed to fetch license types', details: error.message },
        { status: 500 }
      );
    }

    // Mapper les données vers le format TypeScript
    const mappedLicenseTypes: LicenseType[] = licenseTypes?.map(lt => ({
      id: lt.id,
      name: lt.name,
      displayOrder: lt.display_order,
      description: lt.description,
      createdAt: new Date(lt.created_at),
      updatedAt: new Date(lt.updated_at)
    })) || [];

    return NextResponse.json({
      licenseTypes: mappedLicenseTypes,
      count: mappedLicenseTypes.length
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Créer un nouveau type de licence
export async function POST(request: NextRequest) {
  try {
    const { supabase } = await checkAdminPermissions(request);
    const { name, displayOrder, description } = await request.json();

    if (!name || displayOrder === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, displayOrder' },
        { status: 400 }
      );
    }

    const { data: newLicenseType, error: insertError } = await supabase
      .from('license_types')
      .insert({
        name,
        display_order: displayOrder,
        description
      })
      .select()
      .single();

    if (insertError) {
  
      return NextResponse.json(
        { error: 'Failed to create license type', details: insertError.message },
        { status: 500 }
      );
    }

    // Mapper vers le format TypeScript
    const mappedLicenseType: LicenseType = {
      id: newLicenseType.id,
      name: newLicenseType.name,
      displayOrder: newLicenseType.display_order,
      description: newLicenseType.description,
      createdAt: new Date(newLicenseType.created_at),
      updatedAt: new Date(newLicenseType.updated_at)
    };

    return NextResponse.json({
      licenseType: mappedLicenseType,
      message: 'Type de licence créé avec succès'
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH - Modifier un type de licence
export async function PATCH(request: NextRequest) {
  try {
    const { supabase } = await checkAdminPermissions(request);
    const { id, name, displayOrder, description } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (displayOrder !== undefined) updates.display_order = displayOrder;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data: updatedLicenseType, error: updateError } = await supabase
      .from('license_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
  
      return NextResponse.json(
        { error: 'Failed to update license type', details: updateError.message },
        { status: 500 }
      );
    }

    // Mapper vers le format TypeScript
    const mappedLicenseType: LicenseType = {
      id: updatedLicenseType.id,
      name: updatedLicenseType.name,
      displayOrder: updatedLicenseType.display_order,
      description: updatedLicenseType.description,
      createdAt: new Date(updatedLicenseType.created_at),
      updatedAt: new Date(updatedLicenseType.updated_at)
    };

    return NextResponse.json({
      licenseType: mappedLicenseType,
      message: 'Type de licence mis à jour avec succès'
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un type de licence
export async function DELETE(request: NextRequest) {
  try {
    const { supabase } = await checkAdminPermissions(request);
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Vérifier s'il y a des associations existantes
    const { data: associations, error: checkError } = await supabase
      .from('simple_role_licenses')
      .select('id')
      .eq('license_type_id', id)
      .limit(1);

    if (checkError) {
  
      return NextResponse.json(
        { error: 'Failed to check associations', details: checkError.message },
        { status: 500 }
      );
    }

    if (associations && associations.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete license type: there are associated simple roles' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('license_types')
      .delete()
      .eq('id', id);

    if (deleteError) {
  
      return NextResponse.json(
        { error: 'Failed to delete license type', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Type de licence supprimé avec succès'
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
