import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { User } from 'firebase/auth';

export type UserRole = 'admin' | 'petugas' | null;

interface UserProfile {
  email: string;
  role: UserRole;
  name: string;
  petugasId?: string;
}

export function useUserRole(user: User | null) {
  const [role, setRole] = useState<UserRole>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          setRole(data.role);
          setUserProfile(data);
        } else {
          // Check if there is an unlinked user profile created by email
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Found pre-provisioned user! Link it to this UID.
            const existingDoc = querySnapshot.docs[0];
            const data = existingDoc.data() as UserProfile;
            
            // If it's not already at the UID path, move it.
            if (existingDoc.id !== user.uid) {
              await setDoc(userDocRef, data);
              await deleteDoc(existingDoc.ref);
            }
            
            setRole(data.role);
            setUserProfile(data);
          } else {
            // Default for first time user - could be admin or based on email
            const adminEmails = ['febrianataum@gmail.com', 'dysosbla24@gmail.com'];
            const initialProfile: UserProfile = {
              email: user.email || '',
              role: adminEmails.includes(user.email || '') ? 'admin' : 'petugas', // Owner & Admin check
              name: user.displayName || 'User'
            };
            await setDoc(userDocRef, initialProfile);
            setRole(initialProfile.role);
            setUserProfile(initialProfile);
          }
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  return { role, userProfile, loading };
}
