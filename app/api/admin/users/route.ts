import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'lib/utils/supabase/server';
import { UserRole } from 'lib/types/auth';

/**
 * Middleware pour vérifier les permissions d'administrateur
 */
async function checkAdminPermission(req: NextRequest) {
  const supabase = await createClient();
  
  // Vérifier si l'utilisateur est authentifié
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized: Authentication required' },
      { status: 401 }
    );
  }
  
  // Vérifier si l'utilisateur a le rôle d'administrateur
  const userRole = user.user_metadata?.role as UserRole || UserRole.USER;
  
  if (userRole !== UserRole.ADMIN) {
    return NextResponse.json(
      { error: 'Forbidden: Admin permission required' },
      { status: 403 }
    );
  }
  
  return null; // Aucune erreur, l'utilisateur est autorisé
}

/**
 * GET: Liste tous les utilisateurs (admin uniquement)
 */
export async function GET(req: NextRequest) {
  // Vérifier les permissions d'administrateur
  const permissionError = await checkAdminPermission(req);
  if (permissionError) return permissionError;
  
  const supabase = await createClient();
  
  try {
    // Obtenir la liste des utilisateurs
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ users: data.users });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST: Créer un nouvel utilisateur (admin uniquement)
 */
export async function POST(req: NextRequest) {
  // Vérifier les permissions d'administrateur
  const permissionError = await checkAdminPermission(req);
  if (permissionError) return permissionError;
  
  const supabase = await createClient();
  
  try {
    const body = await req.json();
    const { email, password, role = UserRole.USER, permissions = [], ...metadata } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Créer l'utilisateur
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role,
        permissions,
        ...metadata
      }
    });
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ user: data.user }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Mettre à jour un utilisateur (admin uniquement)
 */
export async function PATCH(req: NextRequest) {
  // Vérifier les permissions d'administrateur
  const permissionError = await checkAdminPermission(req);
  if (permissionError) return permissionError;
  
  const supabase = await createClient();
  
  try {
    const body = await req.json();
    const { id, role, permissions, ...metadata } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Mettre à jour l'utilisateur
    const { data, error } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: {
        role,
        permissions,
        ...metadata
      }
    });
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ user: data.user });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Supprimer un utilisateur (admin uniquement)
 */
export async function DELETE(req: NextRequest) {
  // Vérifier les permissions d'administrateur
  const permissionError = await checkAdminPermission(req);
  if (permissionError) return permissionError;
  
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  
  if (!id) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }
  
  const supabase = await createClient();
  
  try {
    // Supprimer l'utilisateur
    const { error } = await supabase.auth.admin.deleteUser(id);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 


