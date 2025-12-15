/**
 * Type definitions for User Profile data structure
 */

export interface UserProfile {
  education_level: string; // Free-form text, e.g., "Master in Computer Science"
  experience_level: string; // Free-form text, e.g., "3 years as Product Manager"
  user_introduction: string;
}

export interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  date_of_birth: string; // Format: YYYY-MM-DD
  user_profile: UserProfile;
}

export interface SignUpFormData {
  email: string;
  password: string;
  fullName: string;
  dateOfBirth: string; // Format: YYYY-MM-DD
  educationLevel: string; // Free-form text
  experienceLevel: string; // Free-form text
  userIntroduction: string;
}