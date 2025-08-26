import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SimpleRoleLicense, SimpleRoleLicenseWithType, LicenseType } from 'lib/types/roleAnalysis';
import { parseLicenseExcelFile } from 'lib/services/license/licenseParsingService';

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

  if (profileError || !profile) {
    throw new Error('Profil utilisateur non trouvé');
  }
  
  if (profile.role?.toLowerCase() !== 'admin') {
    throw new Error('Droits administrateur requis');
  }

  return { supabase, userId: user.user.id };
}

// GET - Récupérer toutes les associations rôle simple <-> licence
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await checkAdminPermissions(request);

    // Récupérer les associations avec les détails du type de licence (JOIN)
    const { data: licenses, error } = await supabase
      .from('simple_role_licenses')
      .select(`
        *,
        license_types:license_type_id (
          id,
          name,
          display_order,
          description,
          created_at,
          updated_at
        )
      `)
      .order('simple_role', { ascending: true });

    if (error) {

      return NextResponse.json(
        { error: 'Failed to fetch licenses', details: error.message },
        { status: 500 }
      );
    }

    // Mapper les données vers le format TypeScript
    const mappedLicenses: SimpleRoleLicenseWithType[] = licenses?.map(license => ({
      id: license.id,
      simpleRole: license.simple_role,
      licenseTypeId: license.license_type_id,
      createdAt: new Date(license.created_at),
      updatedAt: new Date(license.updated_at),
      licenseType: {
        id: license.license_types.id,
        name: license.license_types.name,
        displayOrder: license.license_types.display_order,
        description: license.license_types.description,
        createdAt: new Date(license.license_types.created_at),
        updatedAt: new Date(license.license_types.updated_at)
      }
    })) || [];

    return NextResponse.json({
      licenses: mappedLicenses,
      count: mappedLicenses.length
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle association ou upload Excel
export async function POST(request: NextRequest) {
  try {
    const { supabase } = await checkAdminPermissions(request);
    
    const contentType = request.headers.get('content-type');

    
    // Upload Excel avec 2 feuilles
    if (contentType?.includes('multipart/form-data')) {
  
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

             // Parser le fichier Excel avec 2 feuilles
   
       const parsingResult = await parseLicenseExcelFile(file);
   

       if (parsingResult.errors.length > 0) {
     
         return NextResponse.json(
           { 
             error: 'Erreurs lors du parsing du fichier Excel',
             details: parsingResult.errors.join('; '),
             warnings: parsingResult.warnings
           },
           { status: 400 }
         );
       }

             // === PARTIE 1: GÉRER LES TYPES DE LICENCES ===
       
   
       
       // Supprimer tous les types de licences existants
   
       const { error: deleteLicenseTypesError } = await supabase
         .from('license_types')
         .delete()
         .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprimer tout

       if (deleteLicenseTypesError) {
     
         return NextResponse.json(
           { error: 'Failed to delete existing license types', details: deleteLicenseTypesError.message },
           { status: 500 }
         );
       }
   

       // Insérer les nouveaux types de licences
       const licenseTypesToInsert = parsingResult.licenseTypes.map(lt => ({
         name: lt.name,
         display_order: lt.displayOrder,
         description: lt.description
       }));
       
   

       const { data: insertedLicenseTypes, error: insertLicenseTypesError } = await supabase
         .from('license_types')
         .insert(licenseTypesToInsert)
         .select();

       if (insertLicenseTypesError) {
     
         return NextResponse.json(
           { error: 'Failed to insert license types', details: insertLicenseTypesError.message },
           { status: 500 }
         );
       }
       
   

             // Créer un mapping nom -> id pour les types de licences insérés
       const licenseTypeMap = new Map<string, string>();
       if (!insertedLicenseTypes || insertedLicenseTypes.length === 0) {
     
         return NextResponse.json(
           { error: 'Aucun type de licence n\'a pu être inséré' },
           { status: 500 }
         );
       }
       
       insertedLicenseTypes.forEach(lt => {
     
         licenseTypeMap.set(lt.name, lt.id);
       });
       
   

             // === PARTIE 2: GÉRER LES ASSOCIATIONS RÔLE-LICENCE ===

   
   

       // Supprimer toutes les associations existantes
   
       const { error: deleteAssociationsError } = await supabase
         .from('simple_role_licenses')
         .delete()
         .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprimer tout

       if (deleteAssociationsError) {
     
         return NextResponse.json(
           { error: 'Failed to delete existing associations', details: deleteAssociationsError.message },
           { status: 500 }
         );
       }
   

       // Mapper les associations vers le format de la base de données
       const associationsToInsert = parsingResult.roleLicenseAssociations.map(assoc => {
         const licenseTypeId = licenseTypeMap.get(assoc.licenceType);
     
         
         if (!licenseTypeId) {
       
           throw new Error(`Type de licence "${assoc.licenceType}" non trouvé dans les types créés`);
         }
         
         return {
           simple_role: assoc.simpleRole,
           license_type_id: licenseTypeId
         };
       });
       
   

       // Insérer les nouvelles associations
       const { data: insertedAssociations, error: insertAssociationsError } = await supabase
         .from('simple_role_licenses')
         .insert(associationsToInsert)
         .select(`
           *,
           license_types:license_type_id (
             id,
             name,
             display_order,
             description,
             created_at,
             updated_at
           )
         `);

       if (insertAssociationsError) {
     
         return NextResponse.json(
           { error: 'Failed to insert associations', details: insertAssociationsError.message },
           { status: 500 }
         );
       }
       
   

      // Mapper les associations insérées vers le format TypeScript
      const mappedInsertedLicenses: SimpleRoleLicenseWithType[] = insertedAssociations?.map(license => ({
        id: license.id,
        simpleRole: license.simple_role,
        licenseTypeId: license.license_type_id,
        createdAt: new Date(license.created_at),
        updatedAt: new Date(license.updated_at),
        licenseType: {
          id: license.license_types.id,
          name: license.license_types.name,
          displayOrder: license.license_types.display_order,
          description: license.license_types.description,
          createdAt: new Date(license.license_types.created_at),
          updatedAt: new Date(license.license_types.updated_at)
        }
      })) || [];

      return NextResponse.json({
        message: `${parsingResult.licenseTypes.length} types de licences et ${parsingResult.roleLicenseAssociations.length} associations importées avec succès`,
        licenseTypes: parsingResult.licenseTypes,
        licenses: mappedInsertedLicenses,
        metadata: parsingResult.metadata,
        warnings: parsingResult.warnings,
        count: mappedInsertedLicenses.length
      });
    } 
    // Création manuelle d'une association
    else {
      const { simpleRole, licenseTypeId } = await request.json();
      
      if (!simpleRole || !licenseTypeId) {
        return NextResponse.json(
          { error: 'Missing required fields: simpleRole, licenseTypeId' },
          { status: 400 }
        );
      }

      // Vérifier que le type de licence existe
      const { data: licenseType, error: checkError } = await supabase
        .from('license_types')
        .select('*')
        .eq('id', licenseTypeId)
        .single();

      if (checkError || !licenseType) {
        return NextResponse.json(
          { error: 'License type not found' },
          { status: 400 }
        );
      }

      const { data: newLicense, error: insertError } = await supabase
        .from('simple_role_licenses')
        .insert({
          simple_role: simpleRole,
          license_type_id: licenseTypeId
        })
        .select(`
          *,
          license_types:license_type_id (
            id,
            name,
            display_order,
            description,
            created_at,
            updated_at
          )
        `)
        .single();

      if (insertError) {
    
        return NextResponse.json(
          { error: 'Failed to create license', details: insertError.message },
          { status: 500 }
        );
      }

      // Mapper la licence créée vers le format TypeScript
      const mappedLicense: SimpleRoleLicenseWithType = {
        id: newLicense.id,
        simpleRole: newLicense.simple_role,
        licenseTypeId: newLicense.license_type_id,
        createdAt: new Date(newLicense.created_at),
        updatedAt: new Date(newLicense.updated_at),
        licenseType: {
          id: newLicense.license_types.id,
          name: newLicense.license_types.name,
          displayOrder: newLicense.license_types.display_order,
          description: newLicense.license_types.description,
          createdAt: new Date(newLicense.license_types.created_at),
          updatedAt: new Date(newLicense.license_types.updated_at)
        }
      };

      return NextResponse.json({
        license: mappedLicense,
        message: 'Association créée avec succès'
      });
    }

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH - Modifier une association
export async function PATCH(request: NextRequest) {
  try {
    const { supabase } = await checkAdminPermissions(request);
    const { id, simpleRole, licenseTypeId } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (simpleRole !== undefined) updates.simple_role = simpleRole;
    if (licenseTypeId !== undefined) updates.license_type_id = licenseTypeId;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data: updatedLicense, error: updateError } = await supabase
      .from('simple_role_licenses')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        license_types:license_type_id (
          id,
          name,
          display_order,
          description,
          created_at,
          updated_at
        )
      `)
      .single();

    if (updateError) {
  
      return NextResponse.json(
        { error: 'Failed to update license', details: updateError.message },
        { status: 500 }
      );
    }

    // Mapper la licence mise à jour vers le format TypeScript
    const mappedUpdatedLicense: SimpleRoleLicenseWithType = {
      id: updatedLicense.id,
      simpleRole: updatedLicense.simple_role,
      licenseTypeId: updatedLicense.license_type_id,
      createdAt: new Date(updatedLicense.created_at),
      updatedAt: new Date(updatedLicense.updated_at),
      licenseType: {
        id: updatedLicense.license_types.id,
        name: updatedLicense.license_types.name,
        displayOrder: updatedLicense.license_types.display_order,
        description: updatedLicense.license_types.description,
        createdAt: new Date(updatedLicense.license_types.created_at),
        updatedAt: new Date(updatedLicense.license_types.updated_at)
      }
    };

    return NextResponse.json({
      license: mappedUpdatedLicense,
      message: 'Association mise à jour avec succès'
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une association
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

    const { error: deleteError } = await supabase
      .from('simple_role_licenses')
      .delete()
      .eq('id', id);

    if (deleteError) {
  
      return NextResponse.json(
        { error: 'Failed to delete license', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Association supprimée avec succès'
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
