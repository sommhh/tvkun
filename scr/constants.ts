export interface Channel {
  id: number;
  name: string;
  ch: string;
  power: string;
}

export interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  polarization: string;
  area: string;
  prefecture: 'miyagi' | 'fukushima' | 'yamagata';
  channels: Channel[];
}

export const STATIONS: Record<string, Station> = {
  // --- MIYAGI ---
  dainenji: {
    id: 'dainenji',
    name: '仙台局 (大年寺山)',
    lat: 38.238472,
    lon: 140.874306,
    polarization: '水平',
    area: '宮城：仙台・名取・多賀城',
    prefecture: 'miyagi',
    channels: [
      { id: 1, name: 'TBC東北放送', ch: '19', power: '3kW' },
      { id: 2, name: 'NHK Eテレ', ch: '13', power: '3kW' },
      { id: 3, name: 'NHK 総合', ch: '17', power: '3kW' },
      { id: 4, name: '宮城テレビ', ch: '24', power: '3kW' },
      { id: 5, name: '東日本放送', ch: '28', power: '3kW' },
      { id: 8, name: '仙台放送', ch: '21', power: '3kW' },
    ],
  },
  kesennuma: {
    id: 'kesennuma',
    name: '気仙沼 (長の森山)',
    lat: 38.829444,
    lon: 141.520278,
    polarization: '水平',
    area: '宮城：気仙沼市・南三陸町',
    prefecture: 'miyagi',
    channels: [{ id: 1, name: 'TBC', ch: '23', power: '100W' }],
  },
  ishinomaki: {
    id: 'ishinomaki',
    name: '石巻 (古館山)',
    lat: 38.426111,
    lon: 141.303889,
    polarization: '水平',
    area: '宮城：石巻市・東松島市',
    prefecture: 'miyagi',
    channels: [{ id: 1, name: 'KHB', ch: '28', power: '100W' }],
  },
  akiu: {
    id: 'akiu',
    name: '秋保 (大倉山)',
    lat: 38.224722,
    lon: 140.720556,
    polarization: '水平',
    area: '宮城：太白区秋保町',
    prefecture: 'miyagi',
    channels: [{ id: 1, name: 'NHK 総合', ch: '16', power: '300mW' }],
  },
  shibata: {
    id: 'shibata',
    name: '柴田船迫 (中継局)',
    lat: 38.055556,
    lon: 140.765833,
    polarization: '水平',
    area: '宮城：柴田・名取南・村田',
    prefecture: 'miyagi',
    channels: [{ id: 1, name: 'TBC', ch: '22', power: '50mW' }],
  },
  furukawa: {
    id: 'furukawa',
    name: '古川中継局',
    lat: 38.571389,
    lon: 140.955556,
    polarization: '水平',
    area: '宮城：大崎市古川',
    prefecture: 'miyagi',
    channels: [{ id: 1, name: 'NHK G', ch: '23', power: '10W' }],
  },
  murata: {
    id: 'murata',
    name: '村田 (相山公園)',
    lat: 38.118056,
    lon: 140.717500,
    polarization: '水平',
    area: '宮城：村田町',
    prefecture: 'miyagi',
    channels: [{ id: 1, name: 'NHK G', ch: '13', power: '300mW' }],
  },
  shiroishi: {
    id: 'shiroishi',
    name: '白石 (裏山)',
    lat: 38.002500,
    lon: 140.621389,
    polarization: '水平',
    area: '宮城：白石市中心部',
    prefecture: 'miyagi',
    channels: [{ id: 1, name: 'OX', ch: '21', power: '3W' }],
  },
  naruko: {
    id: 'naruko',
    name: '鳴子 (鳥谷坂)',
    lat: 38.739444,
    lon: 140.713889,
    polarization: '水平',
    area: '宮城：大崎市鳴子温泉',
    prefecture: 'miyagi',
    channels: [{ id: 1, name: 'NHK G', ch: '23', power: '1W' }],
  },
  kakuda: {
    id: 'kakuda',
    name: '角田中継局 (高倉山)',
    lat: 37.976389,
    lon: 140.771944,
    polarization: '水平',
    area: '宮城：角田市・阿武隈川東側',
    prefecture: 'miyagi',
    channels: [{ id: 1, name: 'MMT', ch: '30', power: '30W' }],
  },
  zao: {
    id: 'zao',
    name: '蔵王中継局 (遠刈田)',
    lat: 38.093056,
    lon: 140.650000,
    polarization: '水平',
    area: '宮城：蔵王町・遠刈田温泉',
    prefecture: 'miyagi',
    channels: [{ id: 1, name: 'NHK G', ch: '13', power: '1W' }],
  },
  // --- FUKUSHIMA ---
  sasamori: {
    id: 'sasamori',
    name: '福島局 (笹森山)',
    lat: 37.657917,
    lon: 140.387694,
    polarization: '水平',
    area: '福島：福島市・伊達・二本松',
    prefecture: 'fukushima',
    channels: [
      { id: 1, name: '福島中央', ch: '27', power: '3kW' },
      { id: 2, name: 'NHK Eテレ', ch: '14', power: '3kW' },
      { id: 4, name: '福島テレビ', ch: '25', power: '3kW' },
      { id: 5, name: '福島放送', ch: '29', power: '3kW' },
      { id: 6, name: 'テレビユー福島', ch: '26', power: '3kW' },
    ],
  },
  aizu: {
    id: 'aizu',
    name: '会津若松 (背炙山)',
    lat: 37.472778,
    lon: 139.990833,
    polarization: '水平',
    area: '福島：会津若松・喜多方',
    prefecture: 'fukushima',
    channels: [{ id: 1, name: 'FCT', ch: '22', power: '500W' }],
  },
  // --- YAMAGATA ---
  yamagata: {
    id: 'yamagata',
    name: '山形局 (西蔵王)',
    lat: 38.202482,
    lon: 140.356884,
    polarization: '水平',
    area: '山形：山形・天童・上山',
    prefecture: 'yamagata',
    channels: [
      { id: 1, name: 'NHK 総合', ch: '14', power: '1kW' },
      { id: 2, name: 'NHK Eテレ', ch: '13', power: '1kW' },
      { id: 4, name: '山形放送', ch: '16', power: '1kW' },
      { id: 8, name: 'さくらんぼTV', ch: '22', power: '1kW' },
    ],
  },
  shinjyo: {
    id: 'shinjyo',
    name: '新庄 (杢蔵山)',
    lat: 38.789444,
    lon: 140.401389,
    polarization: '水平',
    area: '山形：新庄・最上',
    prefecture: 'yamagata',
    channels: [{ id: 1, name: 'YBC', ch: '15', power: '100W' }],
  },
};

export const DECLINATION = 8.2;

export interface SatelliteChannel {
  id: string;
  name: string;
  ch: string;
  power: string;
}

export const SAT_LIST: Record<string, SatelliteChannel[]> = {
  bs110: [
    { id: '1', name: 'NHK BS', ch: '101', power: '衛星' },
    { id: '4', name: 'BS日テレ', ch: '141', power: '衛星' },
    { id: '5', name: 'BS朝日', ch: '151', power: '衛星' },
    { id: '6', name: 'BS-TBS', ch: '161', power: '衛星' },
    { id: '7', name: 'BSテレ東', ch: '171', power: '衛星' },
    { id: '8', name: 'BSフジ', ch: '181', power: '衛星' },
  ],
  premium: [
    { id: '124', name: 'スカパー！プレミアム', ch: '124°', power: '衛星' },
    { id: '128', name: 'スカパー！プレミアム', ch: '128°', power: '衛星' },
  ]
};

export const SATELLITES: Record<string, { name: string; lon: number; color: string; desc: string }> = {
  bs110: {
    name: 'BS / 110°CS',
    lon: 110,
    color: '#f97316',
    desc: '最も一般的な衛星放送。方位は南西、午後2時の太陽方向を目安に。',
  },
  premium: {
    name: 'プレミアム 124/128°',
    lon: 124, 
    color: '#38bdf8',
    desc: 'スカパー！プレミアムサービス。BSよりも西に振り、仰角は数度低くなります。',
  },
};
