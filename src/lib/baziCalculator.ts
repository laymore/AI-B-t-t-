import { Solar, Lunar } from 'lunar-javascript';
import { Pillar, Stem, Branch, Element, BaziProfile, TenGod } from '../types/bazi';

const STEMS: Stem[] = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const BRANCHES: Branch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

// Mapping from lunar-javascript names to our Vietnamese names
const stemMap: Record<string, Stem> = {
  '甲': 'Giáp', '乙': 'Ất', '丙': 'Bính', '丁': 'Đinh', '戊': 'Mậu', 
  '己': 'Kỷ', '庚': 'Canh', '辛': 'Tân', '壬': 'Nhâm', '癸': 'Quý'
};

const branchMap: Record<string, Branch> = {
  '子': 'Tý', '丑': 'Sửu', '寅': 'Dần', '卯': 'Mão', '辰': 'Thìn', 
  '巳': 'Tỵ', '午': 'Ngọ', '未': 'Mùi', '申': 'Thân', '酉': 'Dậu', 
  '戌': 'Tuất', '亥': 'Hợi'
};

const elementMap: Record<string, Element> = {
  '木': 'Mộc', '火': 'Hỏa', '土': 'Thổ', '金': 'Kim', '水': 'Thủy'
};

type Polarity = 'Dương' | 'Âm';

const stemMeta: Record<Stem, { element: Element, polarity: Polarity }> = {
  'Giáp': { element: 'Mộc', polarity: 'Dương' },
  'Ất': { element: 'Mộc', polarity: 'Âm' },
  'Bính': { element: 'Hỏa', polarity: 'Dương' },
  'Đinh': { element: 'Hỏa', polarity: 'Âm' },
  'Mậu': { element: 'Thổ', polarity: 'Dương' },
  'Kỷ': { element: 'Thổ', polarity: 'Âm' },
  'Canh': { element: 'Kim', polarity: 'Dương' },
  'Tân': { element: 'Kim', polarity: 'Âm' },
  'Nhâm': { element: 'Thủy', polarity: 'Dương' },
  'Quý': { element: 'Thủy', polarity: 'Âm' },
};

const branchMainStem: Record<Branch, Stem> = {
  'Tý': 'Quý', 'Sửu': 'Kỷ', 'Dần': 'Giáp', 'Mão': 'Ất', 'Thìn': 'Mậu', 
  'Tỵ': 'Bính', 'Ngọ': 'Đinh', 'Mùi': 'Kỷ', 'Thân': 'Canh', 'Dậu': 'Tân', 
  'Tuất': 'Mậu', 'Hợi': 'Nhâm'
};

const relationshipMap: Record<string, Record<string, string>> = {
  'Mộc': { 'Mộc': 'Same', 'Hỏa': 'Produce', 'Thổ': 'Control', 'Kim': 'Controlled', 'Thủy': 'Produced' },
  'Hỏa': { 'Hỏa': 'Same', 'Thổ': 'Produce', 'Kim': 'Control', 'Thủy': 'Controlled', 'Mộc': 'Produced' },
  'Thổ': { 'Thổ': 'Same', 'Kim': 'Produce', 'Thủy': 'Control', 'Mộc': 'Controlled', 'Hỏa': 'Produced' },
  'Kim': { 'Kim': 'Same', 'Thủy': 'Produce', 'Mộc': 'Control', 'Hỏa': 'Controlled', 'Thổ': 'Produced' },
  'Thủy': { 'Thủy': 'Same', 'Mộc': 'Produce', 'Hỏa': 'Control', 'Thổ': 'Controlled', 'Kim': 'Produced' }
};

function getTenGod(dmStem: Stem, targetStem: Stem): TenGod {
  if (!dmStem || !targetStem) return 'Tỷ Kiên';
  const dm = stemMeta[dmStem];
  const target = stemMeta[targetStem];
  if (!dm || !target) return 'Tỷ Kiên';

  const dmEl = dm.element;
  const targetEl = target.element;
  
  if (!relationshipMap[dmEl] || !relationshipMap[dmEl][targetEl]) return 'Tỷ Kiên';

  const rel = relationshipMap[dmEl][targetEl];
  const samePolarity = dm.polarity === target.polarity;

  if (rel === 'Same') return samePolarity ? 'Tỷ Kiên' : 'Kiếp Tài';
  if (rel === 'Produce') return samePolarity ? 'Thực Thần' : 'Thương Quan';
  if (rel === 'Control') return samePolarity ? 'Thiên Tài' : 'Chính Tài';
  if (rel === 'Controlled') return samePolarity ? 'Thiên Quan' : 'Chính Quan';
  if (rel === 'Produced') return samePolarity ? 'Thiên Ấn' : 'Chính Ấn';
  return 'Tỷ Kiên';
}

export function calculateBazi(date: Date) {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  const dmStem = stemMap[eightChar.getDay().charAt(0)];

  const getPillar = (pillarStr: string): Pillar => {
    const s = stemMap[pillarStr.charAt(0)];
    const b = branchMap[pillarStr.charAt(1)];
    const mainS = branchMainStem[b];
    
    return {
      stem: s,
      branch: b,
      stemElement: stemMeta[s].element,
      branchElement: stemMeta[mainS].element,
      stemTenGod: getTenGod(dmStem, s),
      branchTenGod: getTenGod(dmStem, mainS)
    };
  };

  const pillars = {
    year: getPillar(eightChar.getYear()),
    month: getPillar(eightChar.getMonth()),
    day: getPillar(eightChar.getDay()),
    hour: getPillar(eightChar.getTime()),
  };

  // Simple strength calculation based on month branch
  const monthBranch = pillars.month.branch;
  const dayMasterElement = pillars.day.stemElement;
  
  // Very simplified seasonal logic
  const seasonMap: Record<Branch, Element> = {
    'Dần': 'Mộc', 'Mão': 'Mộc', 'Thìn': 'Thổ',
    'Tỵ': 'Hỏa', 'Ngọ': 'Hỏa', 'Mùi': 'Thổ',
    'Thân': 'Kim', 'Dậu': 'Kim', 'Tuất': 'Thổ',
    'Hợi': 'Thủy', 'Tý': 'Thủy', 'Sửu': 'Thổ'
  };
  
  const seasonElement = seasonMap[monthBranch];
  let strength: BaziProfile['strength'] = 'Bình Hòa';
  
  if (seasonElement === dayMasterElement) strength = 'Vượng';
  else if (
    (dayMasterElement === 'Hỏa' && seasonElement === 'Mộc') ||
    (dayMasterElement === 'Thổ' && seasonElement === 'Hỏa') ||
    (dayMasterElement === 'Kim' && seasonElement === 'Thổ') ||
    (dayMasterElement === 'Thủy' && seasonElement === 'Kim') ||
    (dayMasterElement === 'Mộc' && seasonElement === 'Thủy')
  ) strength = 'Vượng';
  else strength = 'Nhược';

  return {
    pillars,
    dayMaster: pillars.day.stem,
    strength,
  };
}
