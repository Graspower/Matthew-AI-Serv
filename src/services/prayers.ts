
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, arrayUnion, increment, Timestamp } from 'firebase/firestore';
import type { Comment, Reactions } from './testimonies'; // Reuse comment/reaction types

export interface Prayer {
  id: string;
  name: string;
  description: string;
  category: string;
  comments: Comment[];
  reactions: Reactions;
}

export type NewPrayer = Omit<Prayer, 'id' | 'comments' | 'reactions'>;

export async function addPrayer(prayer: NewPrayer): Promise<void> {
  try {
    const prayersCol = collection(db, 'prayers');
    await addDoc(prayersCol, {
        ...prayer,
        comments: [],
        reactions: { like: 0, pray: 0, claps: 0, downlike: 0 },
        createdAt: Timestamp.now(),
    });
  } catch (error: any) {
    console.error("Error adding prayer: ", error);
    if (error.code === 'permission-denied') {
        throw new Error("Failed to add prayer: Permission denied. Please check your Firestore security rules.");
    }
    throw new Error(`Failed to add prayer. Please check security rules and network connection. Original error: ${error.code || error.message}`);
  }
}

export async function addCommentToPrayer(prayerId: string, comment: Comment): Promise<void> {
  try {
    const prayerRef = doc(db, 'prayers', prayerId);
    const firestoreComment = {
      ...comment,
      createdAt: Timestamp.fromDate(new Date(comment.createdAt)),
    };
    await updateDoc(prayerRef, {
      comments: arrayUnion(firestoreComment)
    });
  } catch (error: any) {
    console.error("Error adding comment: ", error);
    if (error.code === 'permission-denied') {
      throw new Error("Failed to add comment: Permission denied. Please check your Firestore security rules.");
    }
    throw new Error(`Failed to add comment. Please check your connection. Original error: ${error.code || error.message}`);
  }
}

export async function addReactionToPrayer(prayerId: string, reactionType: keyof Reactions): Promise<void> {
  try {
    const prayerRef = doc(db, 'prayers', prayerId);
    const fieldToIncrement = `reactions.${reactionType}`;
    await updateDoc(prayerRef, {
        [fieldToIncrement]: increment(1)
    });
  } catch (error: any)
  {
    console.error("Error adding reaction: ", error);
    if (error.code === 'permission-denied') {
      throw new Error("Failed to add reaction: Permission denied. Please check your Firestore security rules.");
    }
    throw new Error(`Failed to add reaction. Please check your connection. Original error: ${error.code || error.message}`);
  }
}

export async function getPrayers(): Promise<Prayer[]> {
  try {
    const prayersCol = collection(db, 'prayers');
    const prayerSnapshot = await getDocs(prayersCol);
    
    if (prayerSnapshot.empty) {
        console.log('No matching documents in "prayers" collection.');
        return [];
    }

    const prayerList = prayerSnapshot.docs.map(doc => {
      const data = doc.data();
      const comments = (data.comments || []).map((c: any) => ({
        ...c,
        createdAt: c.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
      }));

      return {
        id: doc.id,
        name: data.name || 'Anonymous',
        description: data.description || '',
        category: data.category || 'Prayer',
        reactions: data.reactions || { like: 0, pray: 0, claps: 0, downlike: 0 },
        comments: comments,
      } as Prayer;
    });

    return prayerList.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    console.error("Error fetching prayers: ", error);
    if (error.code === 'permission-denied') {
        throw new Error("Permission Denied: Your security rules are not set up to allow reading prayers. Please update your Firestore rules to allow 'read' access to the 'prayers' collection.");
    }
    throw new Error(`Failed to fetch prayers. Please check your network connection. Original error: ${error.code || error.message}`);
  }
}
