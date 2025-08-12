import { API_BASE_URL } from '../services/config';

/**
 * Get the profile picture URL with consistent default fallback
 * This ensures all components use the same default profile picture
 */
export const getProfilePictureUrl = (profilePicture) => {
  if (profilePicture && profilePicture.trim() !== '') {
    // If it's already a full URL (S3 or external)
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }
    // If it's a filename, construct the URL
    return `${API_BASE_URL}/uploads/profile_pictures/${profilePicture}`;
  }
  
  // Default profile picture - same as used in Profile component
  return "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ccircle cx='50' cy='35' r='15' fill='%23bdbdbd'/%3E%3Cellipse cx='50' cy='85' rx='25' ry='20' fill='%23bdbdbd'/%3E%3C/svg%3E";
};

/**
 * Get the default profile picture URL
 * Used for onError handlers
 */
export const getDefaultProfilePicture = () => {
  return "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ccircle cx='50' cy='35' r='15' fill='%23bdbdbd'/%3E%3Cellipse cx='50' cy='85' rx='25' ry='20' fill='%23bdbdbd'/%3E%3C/svg%3E";
};