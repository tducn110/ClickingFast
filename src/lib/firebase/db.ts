import { doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "./config";

export interface ScoreRecord {
  userId: string;
  displayName: string;
  score: number;
  playtime?: number;
  createdAt: Date;
}

// Lưu điểm số mới của người chơi (Chỉ lưu nếu cao hơn điểm cũ)
export const saveUserScore = async (userId: string, displayName: string, score: number, playtime: number) => {
  try {
    const docRef = doc(db, "scores", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const existingData = docSnap.data();
      if (score > existingData.score) {
        // Cập nhật điểm cao mới và thời gian
        await setDoc(docRef, {
          userId,
          displayName,
          score,
          playtime,
          createdAt: new Date()
        }, { merge: true });
      }
    } else {
      // Chưa có điểm, tạo mới
      await setDoc(docRef, {
        userId,
        displayName,
        score,
        playtime,
        createdAt: new Date()
      });
    }
  } catch (error) {
    console.error("Lỗi khi lưu điểm số:", error);
    throw error;
  }
};

// Lấy bảng xếp hạng (top 10)
export const getLeaderboard = async (topN: number = 10): Promise<ScoreRecord[]> => {
  try {
    const scoresRef = collection(db, "scores");
    const q = query(scoresRef, orderBy("score", "desc"), limit(topN));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        userId: data.userId,
        displayName: data.displayName,
        score: data.score,
        playtime: data.playtime,
        createdAt: data.createdAt.toDate(),
      };
    });
  } catch (error) {
    console.error("Lỗi khi lấy bảng xếp hạng:", error);
    return [];
  }
};
