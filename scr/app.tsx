/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Compass, 
  MapPin, 
  Tv, 
  Layers, 
  Satellite, 
  ExternalLink,
  RotateCcw,
  Info,
  Navigation,
  CheckCircle2,
  Volume2,
  VolumeX,
  Crosshair
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { STATIONS, DECLINATION, SATELLITES, SAT_LIST } from './constants';
import { 
  calculateBearing, 
  calculateDistance, 
  calculateSatellite, 
  getDirectionNameJa,
  calculateSignalScore,
  checkTerrainObstacle,
  smoothValue,
  calculateDeclination,
  calculateTerrestrialElevation
} from './utils';

export default function App() {
  const [userLoc, setUserLoc] = useState({ lat: 38.238, lon: 140.874, accuracy: null as number | null }); // Default: Sendai
  const [locStatus, setLocStatus] = useState<'default' | 'loading' | 'success'>('default');
  const [rawHeading, setRawHeading] = useState<number | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [headingOffset, setHeadingOffset] = useState<number>(0);
  const [selectedStationKey, setSelectedStationKey] = useState<string>('dainenji');
  const [autoSelect, setAutoSelect] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'detail' | 'bs'>('main');
  const [prefFilter, setPrefFilter] = useState<'all' | 'miyagi' | 'fukushima' | 'yamagata' | 'satellite'>('all');
  const [isCompassAvailable, setIsCompassAvailable] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [isObstacleBlocked, setIsObstacleBlocked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const audioCtx = useRef<AudioContext | null>(null);
  const lastBeepTime = useRef<number>(0);

  // Terrestrial Elevation (Vertical Tilt)
  const terrestrialElevation = useMemo(() => {
    if (selectedStationKey === 'bs110' || selectedStationKey === 'premium') return null;
    const station = STATIONS[selectedStationKey];
    if (!station) return 0;
    return calculateTerrestrialElevation(userLoc.lat, userLoc.lon, station.lat, station.lon);
  }, [userLoc, selectedStationKey]);

  // Filtering stations based on prefecture tab
  const filteredStations = useMemo(() => {
    if (prefFilter === 'satellite') return [];
    const list = Object.values(STATIONS);
    if (prefFilter === 'all') return list;
    return list.filter(s => s.prefecture === prefFilter);
  }, [prefFilter]);

  // Smoothing loop for device heading
  useEffect(() => {
    if (rawHeading === null) return;
    let frameId: number;
    const loop = () => {
      setDeviceHeading(prev => prev === null ? rawHeading : smoothValue(prev, rawHeading, 0.2));
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [rawHeading]);

  const currentDeclination = useMemo(() => {
    return calculateDeclination(userLoc.lat, userLoc.lon);
  }, [userLoc.lat, userLoc.lon]);

  // Derived Values
  const satelliteInfo = useMemo(() => {
    const bs = calculateSatellite(userLoc.lat, userLoc.lon, SATELLITES.bs110.lon);
    const premium = calculateSatellite(userLoc.lat, userLoc.lon, SATELLITES.premium.lon);
    return {
      bs: {
        az: (bs.azimuth - currentDeclination + 360) % 360,
        el: bs.elevation
      },
      premium: {
        az: (premium.azimuth - currentDeclination + 360) % 360,
        el: premium.elevation
      }
    };
  }, [userLoc, currentDeclination]);

  const magneticBearing = useMemo(() => {
    if (selectedStationKey === 'bs110') return satelliteInfo.bs.az;
    if (selectedStationKey === 'premium') return satelliteInfo.premium.az;
    
    const selectedStation = STATIONS[selectedStationKey];
    if (!selectedStation) return 0;
    const trueBearing = calculateBearing(userLoc.lat, userLoc.lon, selectedStation.lat, selectedStation.lon);
    return (trueBearing - currentDeclination + 360) % 360;
  }, [userLoc, selectedStationKey, satelliteInfo, currentDeclination]);

  const distance = useMemo(() => {
    if (selectedStationKey === 'bs110' || selectedStationKey === 'premium') return 35786; // Geosynchronous altitude approx
    const selectedStation = STATIONS[selectedStationKey];
    if (!selectedStation) return 0;
    return calculateDistance(userLoc.lat, userLoc.lon, selectedStation.lat, selectedStation.lon);
  }, [userLoc, selectedStationKey]);

  const alignmentDiff = useMemo(() => {
    if (deviceHeading === null) return null;
    const currentHeading = (deviceHeading - headingOffset + 360) % 360;
    const diff = Math.abs(((magneticBearing - currentHeading + 540) % 360) - 180);
    return diff > 180 ? 360 - diff : diff;
  }, [magneticBearing, deviceHeading, headingOffset]);

  const alignmentStatus = useMemo(() => {
    if (alignmentDiff === null) return { text: '--', color: 'text-zinc-500', bg: 'bg-zinc-800' };
    if (alignmentDiff < 2) return { text: 'OK ピッタリ', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' };
    if (alignmentDiff < 8) return { text: 'もう少し', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' };
    return { text: 'ずれてる', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' };
  }, [alignmentDiff]);

  // Calibration
  const calibrate = () => {
    if (rawHeading !== null) {
      setHeadingOffset(rawHeading);
      alert('現在の方位をゼロ基準として設定しました。');
    }
  };

  // Sound Guide Logic
  useEffect(() => {
    if (!soundEnabled || rawHeading === null || alignmentDiff === null) return;

    const interval = alignmentDiff < 2 ? 100 : alignmentDiff < 5 ? 300 : alignmentDiff < 15 ? 600 : 1000;
    
    const playBeep = () => {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtx.current.state === 'suspended') {
        audioCtx.current.resume();
      }
      const now = audioCtx.current.currentTime;
      if (now - lastBeepTime.current < interval / 1000 - 0.05) return;

      const osc = audioCtx.current.createOscillator();
      const gain = audioCtx.current.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.current.destination);
      osc.frequency.value = alignmentDiff < 2 ? 1200 : 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      lastBeepTime.current = now;
    };

    const timer = setInterval(playBeep, interval);
    return () => clearInterval(timer);
  }, [soundEnabled, rawHeading, alignmentDiff]);

  const currentStationName = useMemo(() => {
    if (selectedStationKey === 'bs110') return 'BS / 110度CS';
    if (selectedStationKey === 'premium') return 'スカパー！プレミアム';
    return STATIONS[selectedStationKey]?.name || 'Unknown';
  }, [selectedStationKey]);

  const currentPolarization = useMemo(() => {
    if (selectedStationKey === 'bs110' || selectedStationKey === 'premium') return '円偏波';
    return STATIONS[selectedStationKey]?.polarization || '水平';
  }, [selectedStationKey]);

  // Auto Selection Logic
  useEffect(() => {
    if (!autoSelect) return;

    const findBest = async () => {
      let bestKey = 'dainenji';
      let maxScore = -Infinity;

      for (const [key, station] of Object.entries(STATIONS)) {
        const dist = calculateDistance(userLoc.lat, userLoc.lon, station.lat, station.lon);
        // Power in Watts
        const pwrStr = station.channels[0]?.power || '3000';
        let pwr = 3000;
        if (pwrStr.includes('kW')) pwr = parseFloat(pwrStr) * 1000;
        else if (pwrStr.includes('W')) pwr = parseFloat(pwrStr);
        else if (pwrStr.includes('mW')) pwr = parseFloat(pwrStr) / 1000;

        const score = calculateSignalScore(dist, pwr, key !== 'dainenji' && key !== 'sasamori' && key !== 'yamagata');
        
        if (score > maxScore) {
          maxScore = score;
          bestKey = key;
        }
      }
      setSelectedStationKey(bestKey);
    };

    findBest();
  }, [userLoc, autoSelect]);

  // Obstacle Check Logic
  useEffect(() => {
    if (selectedStationKey === 'bs110' || selectedStationKey === 'premium') {
      setIsObstacleBlocked(false);
      return;
    }
    
    const check = async () => {
      const station = STATIONS[selectedStationKey];
      if (!station) return;
      const blocked = await checkTerrainObstacle(userLoc.lat, userLoc.lon, station.lat, station.lon);
      setIsObstacleBlocked(blocked);
    };
    check();
  }, [userLoc, selectedStationKey]);

  // Geolocation
  const requestLocation = useCallback(() => {
    setLocStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ 
          lat: pos.coords.latitude, 
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy 
        });
        setLocStatus('success');
      },
      () => {
        setLocStatus('default');
        alert('位置情報の取得に失敗しました。デフォルト設定で表示します。');
      },
      { enableHighAccuracy: true }
    );
  }, []);

  // Compass Logic
  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    // iOS Safari
    const webkitHeading = (e as any).webkitCompassHeading;
    if (typeof webkitHeading === 'number') {
      setRawHeading(webkitHeading);
    } else if (e.alpha !== null) {
      // Android / Other standard
      setRawHeading((360 - e.alpha) % 360);
    }
  }, []);

  useEffect(() => {
    if (typeof DeviceOrientationEvent !== 'undefined') {
      setIsCompassAvailable(true);
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        setNeedsPermission(true);
      } else {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [handleOrientation]);

  const requestCompassPermission = async () => {
    try {
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      if (permission === 'granted') {
        window.addEventListener('deviceorientation', handleOrientation, true);
        setNeedsPermission(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100 font-sans selection:bg-orange-500/30 selection:text-orange-200">
      <div className="max-w-[1060px] mx-auto px-4 py-6 md:py-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-orange-600/20 text-orange-400 text-[10px] font-bold tracking-wider uppercase">Miyagi Edition</span>
              <span className="text-zinc-500 text-xs">v3.1.0</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              アンテナ方向<span className="text-orange-500">チェッカー</span>
            </h1>
            <p className="text-zinc-400 text-sm mt-1">地デジ・BS/110°CS 完全対応 | 高精度プロモード</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border transition-all ${soundEnabled ? 'bg-orange-600 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
              title="サウンドガイド（音での角度調整）"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button 
              onClick={calibrate}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-orange-500 transition-all"
              title="方位校正（現在の向きを基準にする）"
            >
              <Crosshair size={18} />
            </button>
            <button 
              onClick={requestLocation}
              disabled={locStatus === 'loading'}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition active:scale-95 disabled:opacity-50"
            >
              <MapPin className={`w-4 h-4 ${locStatus === 'success' ? 'text-emerald-500' : 'text-zinc-400'}`} />
              <span className="text-sm font-medium">現在地を取得</span>
              {locStatus === 'loading' && <RotateCcw className="w-3 h-3 animate-spin text-zinc-500" />}
            </button>
          </div>
        </header>

        {/* HUD Stats */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center gap-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Device Heading</div>
              <div className="text-lg font-mono font-bold">{deviceHeading !== null ? `${Math.round(deviceHeading)}°` : '--'}</div>
            </div>
          </div>
          
          <div className="h-8 w-px bg-zinc-800 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">GPS Accuracy</div>
              <div className="text-xs font-mono text-zinc-300">
                {userLoc.accuracy !== null ? `±${userLoc.accuracy.toFixed(1)}m` : 'Wait GPS...'}
              </div>
            </div>
          </div>

          {needsPermission && (
            <button 
              onClick={requestCompassPermission}
              className="ml-auto px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-bold transition-all"
            >
              コンパスを有効化
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-2xl w-full sm:w-fit mb-8 gap-1">
          <TabButton active={activeTab === 'main'} onClick={() => setActiveTab('main')} icon={<Compass className="w-4 h-4" />}>方位計</TabButton>
          <TabButton active={activeTab === 'detail'} onClick={() => setActiveTab('detail')} icon={<Layers className="w-4 h-4" />}>ch詳細</TabButton>
          <TabButton active={activeTab === 'bs'} onClick={() => setActiveTab('bs')} icon={<Satellite className="w-4 h-4" />}>BS/衛星</TabButton>
        </div>

        {/* Dynamic Content Pane */}
        <AnimatePresence mode="wait">
          {activeTab === 'main' && (
            <motion.div 
              key="main"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid lg:grid-cols-5 gap-6"
            >
              {/* Compass Card */}
              <div className="lg:col-span-2 bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 rounded-[32px] p-8 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-orange-500/20" />
                
                <h2 className="absolute top-6 left-8 font-bold text-sm tracking-widest text-zinc-500 uppercase flex items-center gap-2">
                  <Navigation className="w-3 h-3" /> Real-time Compass
                </h2>

                <div className="relative w-[280px] h-[280px] md:w-[320px] md:h-[320px] mb-8">
                  {/* Outer Dial */}
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-zinc-800 transition-transform duration-200 ease-out"
                    style={{ transform: `rotate(${- ((deviceHeading || 0) - headingOffset + 360) % 360}deg)` }}
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 font-black text-xs text-red-500">N</div>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 font-black text-xs text-zinc-700">S</div>
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 font-black text-xs text-zinc-700">E</div>
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 font-black text-xs text-zinc-700">W</div>
                    
                    {/* Ticks */}
                    {[...Array(72)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`absolute left-1/2 top-0 h-2 w-[1px] origin-[0_140px] md:origin-[0_160px] ${i % 9 === 0 ? 'bg-zinc-500 h-3 w-0.5' : 'bg-zinc-700'}`}
                        style={{ transform: `translateX(-50%) rotate(${i * 5}deg)` }}
                      />
                    ))}
                  </div>

                  {/* Device Orientation Needle */}
                  <div className="absolute left-1/2 top-1/2 w-[3px] h-[42%] origin-bottom -translate-x-1/2 -translate-y-full z-10">
                     <div className="w-full h-full bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
                  </div>

                  {/* Target Pointer */}
                  <div 
                    className="absolute inset-0 transition-transform duration-300 ease-out z-20"
                    style={{ transform: `rotate(${(magneticBearing - ((deviceHeading || 0) - headingOffset + 360) % 360)}deg)` }}
                  >
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-[48%] rounded-full shadow-[0_0_20px_rgba(249,115,22,0.4)] ${
                      alignmentDiff !== null && alignmentDiff < 2 ? 'bg-emerald-500' :
                      alignmentDiff !== null && alignmentDiff < 8 ? 'bg-amber-500' : 'bg-orange-600'
                    }`} />
                  </div>

                  {/* Center UI */}
                  <div className="absolute inset-16 rounded-full bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col items-center justify-center p-4 text-center z-30">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Target Bearing</div>
                    <div className="text-4xl font-black text-white tracking-tighter leading-none mb-1">
                      {magneticBearing.toFixed(1)}°
                    </div>
                    <div className="px-3 py-1 rounded-full bg-orange-600/10 text-orange-400 text-sm font-bold">
                      {getDirectionNameJa(magneticBearing)}
                    </div>
                  </div>

                  {/* Alignment Badge */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur px-3 py-1.5 rounded-xl border border-zinc-800 pointer-events-none">
                     <div className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap px-2 py-0.5 rounded border ${alignmentStatus.bg} ${alignmentStatus.color}`}>
                        {alignmentStatus.text} {alignmentDiff !== null ? `(${alignmentDiff.toFixed(1)}°)` : ''}
                     </div>
                  </div>
                </div>

                <div className="w-full h-px bg-zinc-800 mb-6" />
                
                <div className="flex gap-4 w-full">
                   <div className="flex-1 bg-zinc-950/50 rounded-2xl p-4 border border-zinc-800/50">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Distance</div>
                      <div className="text-xl font-bold">{distance.toFixed(1)} <span className="text-sm font-normal text-zinc-500">km</span></div>
                   </div>
                   <div className="flex-1 bg-zinc-950/50 rounded-2xl p-4 border border-zinc-800/50">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Pol.</div>
                      <div className="text-xl font-bold">{currentPolarization}</div>
                   </div>
                </div>
              </div>

              {/* Station Control Card */}
              <div className="lg:col-span-3 flex flex-col gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-orange-600/10 text-orange-500">
                        <Tv className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">局選択</h3>
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Station Select</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={() => setAutoSelect(!autoSelect)}
                         className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all border shadow-lg ${
                           autoSelect ? 'bg-emerald-500 border-emerald-400 text-black animate-pulse' : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                         }`}
                       >
                         Auto
                       </button>
                    </div>
                  </div>

                  {/* Pref Filters */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
                    <FilterButton active={prefFilter === 'all'} onClick={() => { setPrefFilter('all'); setAutoSelect(false); }}>ALL</FilterButton>
                    <FilterButton active={prefFilter === 'miyagi'} onClick={() => { setPrefFilter('miyagi'); setAutoSelect(false); }}>宮城</FilterButton>
                    <FilterButton active={prefFilter === 'fukushima'} onClick={() => { setPrefFilter('fukushima'); setAutoSelect(false); }}>福島</FilterButton>
                    <FilterButton active={prefFilter === 'yamagata'} onClick={() => { setPrefFilter('yamagata'); setAutoSelect(false); }}>山形</FilterButton>
                    <FilterButton active={prefFilter === 'satellite'} onClick={() => { setPrefFilter('satellite'); setAutoSelect(false); }}>衛星</FilterButton>
                  </div>

                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                    {filteredStations.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => {
                          setSelectedStationKey(st.id);
                          setAutoSelect(false);
                        }}
                        className={`w-full flex items-center justify-between p-3.5 rounded-[18px] border transition-all ${
                          selectedStationKey === st.id 
                            ? 'bg-orange-600/5 border-orange-500/50 ring-1 ring-orange-500/20 shadow-xl' 
                            : 'bg-zinc-950/20 border-zinc-800/40 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-bold text-sm mb-0.5">{st.name}</div>
                          <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                             <MapPin className="w-2.5 h-2.5" />
                             {st.area}
                          </div>
                        </div>
                        {selectedStationKey === st.id && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-orange-500">
                            <CheckCircle2 className="w-4 h-4" />
                          </motion.div>
                        )}
                      </button>
                    ))}
                    
                    {(prefFilter === 'all' || prefFilter === 'satellite') && (
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <button
                          onClick={() => { setSelectedStationKey('bs110'); setAutoSelect(false); }}
                          className={`flex flex-col items-center justify-center p-4 rounded-[20px] border transition-all ${
                            selectedStationKey === 'bs110' 
                              ? 'bg-orange-600/5 border-orange-500/50 ring-1 ring-orange-500/20' 
                              : 'bg-zinc-950/50 border-zinc-800'
                          }`}
                        >
                            <Satellite className={`w-5 h-5 mb-2 ${selectedStationKey === 'bs110' ? 'text-orange-500' : 'text-zinc-500'}`} />
                            <div className="font-bold text-xs uppercase tracking-tighter">BS / 110CS</div>
                        </button>
                        <button
                          onClick={() => { setSelectedStationKey('premium'); setAutoSelect(false); }}
                          className={`flex flex-col items-center justify-center p-4 rounded-[20px] border transition-all ${
                            selectedStationKey === 'premium' 
                              ? 'bg-sky-600/5 border-sky-500/50 ring-1 ring-sky-500/20' 
                              : 'bg-zinc-950/50 border-zinc-800'
                          }`}
                        >
                            <Satellite className={`w-5 h-5 mb-2 ${selectedStationKey === 'premium' ? 'text-sky-500' : 'text-zinc-500'}`} />
                            <div className="font-bold text-xs uppercase tracking-tighter">Premium</div>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 pt-8 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-widest">Selected Info</div>
                        <h4 className="text-xl font-extrabold">{currentStationName}</h4>
                        {STATIONS[selectedStationKey] ? (
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-sm text-zinc-400">{STATIONS[selectedStationKey].area}</p>
                            {terrestrialElevation !== null && (
                              <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-orange-400">
                                推奨仰角: {terrestrialElevation.toFixed(1)}°
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-400 mt-1">南南西（午後2時の太陽方向を目安）</p>
                        )}
                      </div>
                      {STATIONS[selectedStationKey] && (
                        <a 
                          href={`https://www.google.com/maps?q=${STATIONS[selectedStationKey].lat},${STATIONS[selectedStationKey].lon}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-3 rounded-2xl bg-zinc-800 text-zinc-300 hover:text-white transition shadow-xl"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alignment Pro-Tip / Warning */}
                {isObstacleBlocked ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-600/10 border border-red-600/20 rounded-[28px] p-6 flex items-start gap-4 shadow-2xl"
                  >
                    <div className="p-2 rounded-xl bg-red-600/20 text-red-500 mt-1">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-red-200">遮蔽物の可能性（高）</h4>
                      <p className="text-xs text-red-300/70 mt-1 leading-relaxed">
                        送信所との間に山や高い建物がある可能性があります。反射波を探すか、別の中継局（柴田など）を検討してください。
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-orange-600/10 border border-orange-600/20 rounded-[28px] p-6 flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-orange-600/20 text-orange-400 mt-1">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-orange-200">アンテナ工事のコツ</h4>
                      <p className="text-xs text-orange-300/70 mt-1 leading-relaxed">
                        送信所が見えない場合は、建物の反射波を利用することも検討してください。
                        調整は5度ずつ、ゆっくり動かしながらレベルを確認するのが基本です。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'detail' && (
             <motion.div 
               key="detail"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden"
             >
                <div className="p-8 border-b border-zinc-800">
                   <h3 className="text-2xl font-black mb-1">{currentStationName}</h3>
                   <p className="text-zinc-500 text-sm">
                      放送局別の周波数・チャンネル設定
                   </p>
                </div>
                {(STATIONS[selectedStationKey] || SAT_LIST[selectedStationKey]) && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-950 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          <tr>
                            <th className="px-8 py-4">ID</th>
                            <th className="px-8 py-4">放送局名</th>
                            <th className="px-8 py-4">チャンネル</th>
                            <th className="px-8 py-4">出力/区分</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                          {(STATIONS[selectedStationKey]?.channels || SAT_LIST[selectedStationKey] || []).map((ch: any) => (
                            <tr key={ch.id} className="hover:bg-zinc-800/30 transition">
                                <td className="px-8 py-5">
                                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 font-mono font-bold text-orange-500">
                                    {ch.id}
                                  </span>
                                </td>
                                <td className="px-8 py-5 font-bold text-zinc-200">{ch.name}</td>
                                <td className="px-8 py-5 font-mono text-zinc-400">{ch.ch}</td>
                                <td className="px-8 py-5 text-zinc-500 text-sm">{ch.power}</td>
                            </tr>
                          ))}
                        </tbody>
                    </table>
                  </div>
                )}
             </motion.div>
          )}

          {activeTab === 'bs' && (
            <motion.div 
              key="bs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid md:grid-cols-2 gap-6"
            >
              <SatelliteCard 
                title="BS / 110度CS" 
                info={satelliteInfo.bs} 
                color="#f97316"
                desc="最も一般的な衛星放送。方位は南西、午後2時の太陽を目安に。"
              />
              <SatelliteCard 
                title="スカパー！プレミアム" 
                info={satelliteInfo.premium} 
                color="#0ea5e9"
                desc="124/128度衛星。BSよりも西に振り、仰角は数度低くなります。"
              />
              <div className="md:col-span-2 bg-amber-600/10 border border-amber-600/20 rounded-[24px] p-6 text-sm text-amber-200/80 leading-relaxed">
                <strong>重要:</strong> 衛星アンテナは1ミリのズレで受信できなくなります。まずは仰角（上下）をボルトの目盛りで正確に固定し、そのあとゆっくりと左右を探してください。
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-16 pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-600 text-xs font-medium">
          <p>© 2026 東北アンテナ方向チェッカー (宮城・福島・山形)</p>
          <div className="flex items-center gap-4">
             <span>磁気偏角自動補正済み ({currentDeclination.toFixed(1)}°W)</span>
             <span className="w-1 h-1 rounded-full bg-zinc-800" />
             <span>プロモード稼働中</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FilterButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
        active 
          ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-500/20' 
          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {children}
    </button>
  );
}

function TabButton({ children, active, onClick, icon }: { children: React.ReactNode, active: boolean, onClick: () => void, icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
        active 
          ? 'bg-zinc-800 text-white shadow-xl' 
          : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function SatelliteCard({ title, info, color, desc }: { title: string, info: { az: number, el: number }, color: string, desc: string }) {
  // Simple geometric viz for elevation
  const angleRad = (info.el * Math.PI) / 180;
  const x = Math.cos(angleRad) * 60;
  const y = -Math.sin(angleRad) * 60;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          {title}
        </h3>
        <div className="px-3 py-1 rounded-lg bg-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Miyagi Area</div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-8 mb-8">
        <div className="flex-1 space-y-6">
          <div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">方位角 (Magnetic)</div>
            <div className="text-3xl font-black">{info.az.toFixed(1)}°</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">仰角 (Elevation)</div>
            <div className="text-3xl font-black" style={{ color }}>{info.el.toFixed(1)}°</div>
          </div>
        </div>

        <div className="relative w-40 h-32 bg-black/40 rounded-2xl border border-zinc-800/50 flex items-center justify-center overflow-hidden">
          <div className="absolute bottom-4 left-6 w-24 h-0.5 bg-zinc-800" /> {/* Ground line */}
          <div className="absolute bottom-4 left-6 flex items-center justify-center">
            <svg width="100" height="80" viewBox="0 0 100 80">
              <path 
                d={`M 0 60 L ${x} ${60 + y}`} 
                stroke={color} 
                strokeWidth="4" 
                strokeLinecap="round" 
                fill="none"
              />
              <circle cx="0" cy="60" r="4" fill={color} />
              <text x="70" y="55" fill={color} fontSize="10" fontWeight="bold">{info.el.toFixed(1)}°</text>
            </svg>
          </div>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-zinc-600 uppercase">Elevation Guide</div>
        </div>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed mt-auto">
        {desc}
      </p>
    </div>
  );
}
