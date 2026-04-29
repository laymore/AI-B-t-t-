export type Element = 'Mộc' | 'Hỏa' | 'Thổ' | 'Kim' | 'Thủy';

export type Stem = 'Giáp' | 'Ất' | 'Bính' | 'Đinh' | 'Mậu' | 'Kỷ' | 'Canh' | 'Tân' | 'Nhâm' | 'Quý';

export type Branch = 'Tý' | 'Sửu' | 'Dần' | 'Mão' | 'Thìn' | 'Tỵ' | 'Ngọ' | 'Mùi' | 'Thân' | 'Dậu' | 'Tuất' | 'Hợi';

export type TenGod = 'Tỷ Kiên' | 'Kiếp Tài' | 'Thực Thần' | 'Thương Quan' | 'Thiên Tài' | 'Chính Tài' | 'Thiên Quan' | 'Chính Quan' | 'Thiên Ấn' | 'Chính Ấn';

export interface Pillar {
  stem: Stem;
  branch: Branch;
  stemElement: Element;
  branchElement: Element;
  stemTenGod: TenGod;
  branchTenGod: TenGod;
}

export interface BaziProfile {
  id: string;
  name: string;
  birthDate: string; // ISO
  gender: 'Nam' | 'Nữ';
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  strength: 'Cực Nhược' | 'Nhược' | 'Bình Hòa' | 'Vượng' | 'Cực Vượng';
  dayMaster: Stem;
}
