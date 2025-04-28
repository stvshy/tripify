// hooks/useMutualFriendship.ts
import { useEffect } from 'react';
import { auth, db } from '../app/config/firebaseConfig';
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { Alert } from 'react-native';

export default function useMutualFriendship() {
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const friends: string[] = userData.friends || [];

        for (const friendUid of friends) {
          const friendDocRef = doc(db, 'users', friendUid);
          const friendDocSnap = await getDoc(friendDocRef);

          if (friendDocSnap.exists()) {
            const friendData = friendDocSnap.data();
            const friendFriends: string[] = friendData.friends || [];

            if (!friendFriends.includes(currentUser.uid)) {
              // Dodaj currentUser do listy znajomych friend
              await updateDoc(friendDocRef, {
                friends: arrayUnion(currentUser.uid)
              });
              Alert.alert('Sukces', `Dodano Cię do listy znajomych użytkownika ${friendData.nickname || 'Unknown'}`);
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);
}
