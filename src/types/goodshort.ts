// GoodShort API Types

export interface GoodShortItem {
  actionType: string;
  action: string;
  bookId: string;
  bookType: number;
  bookName: string;
  member: number;
  pseudonym: string;
  introduction: string;
  cover: string;
  image?: string; // Banner image from foryou
  viewCount: number;
  viewCountDisplay?: string;
  typeTwoNames?: string[];
  grade?: string;
  ratings: number;
  unrealBook: boolean;
  chapterCount: number;
  firstChapterId: number;
  labels?: string[];
  sequence: number;
  interactive: boolean;
  fullHDEnable: boolean;
  downloadEnable: boolean;
  supportHorizontal?: number;
  rankLabelType?: number;
  rankLabelStr?: string;
  cornerType?: number;
  cornerText?: string;
  showLike: boolean;
  inLibrary: boolean;
}

export interface GoodShortRecord {
  channelId: number;
  columnId: number;
  name: string;
  style: string;
  actionType?: string;
  action?: string;
  items: GoodShortItem[];
  sortRule?: number;
  slide?: number;
  showPv?: number;
  more?: boolean;
  rankConfig?: any;
}

export interface GoodShortRankListResponse {
  data: {
    current: number;
    size: number;
    total: number;
    records: GoodShortRecord[];
    pages: number;
  };
  status: number;
  message: string;
  timestamp: number;
  success: boolean;
}

export interface GoodShortForYouResponse {
  data: {
    current: number;
    size: number;
    total: number;
    records: GoodShortRecord[];
    pages: number;
  };
  status: number;
  message: string;
  timestamp: number;
  success: boolean;
}
