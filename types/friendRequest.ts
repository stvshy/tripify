// types.d.ts
export interface FriendRequest {
    id: string;
    senderUid: string;
    receiverUid: string;
    status: 'pending' | 'accepted' | 'rejected' | 'canceled';
    createdAt: any; // Firestore Timestamp lub Date
  }
  
  export interface User {
    uid: string;
    nickname?: string;
  }
  