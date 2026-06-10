// Authentication payload and user identity types.

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

export interface SignUpPayload {
  email: string;
  password: string;
  display_name: string;
  date_of_birth: string;
  country_code?: string;
  city?: string;
  bio?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdatePasswordPayload {
  current_password: string;
  new_password: string;
}
