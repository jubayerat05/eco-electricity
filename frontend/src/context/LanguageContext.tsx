import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'bn';

const translations: Record<string, Record<Language, string>> = {
  // ─── Header ──────────────────────────────────────────────
  'dashboard.title': { en: 'Eco-Electricity', bn: 'ইকো-ইলেকট্রিসিটি' },
  'dashboard.subtitle': { en: 'Real-time building management & analytics', bn: 'রিয়েল-টাইম বিল্ডিং ম্যানেজমেন্ট ও অ্যানালিটিক্স' },
  'office.hours': { en: 'Office Hours', bn: 'অফিস সময়' },
  'office.open': { en: '9 AM - 5 PM (Open)', bn: '৯টা - ৫টা (খোলা)' },
  'office.closed': { en: 'After Hours', bn: 'অফিস বন্ধ' },
  'live.load': { en: 'Live Load', bn: 'লাইভ লোড' },
  'devices.active': { en: 'Devices Active', bn: 'সক্রিয় ডিভাইস' },

  // ─── Simulation Console ──────────────────────────────────
  'simulation': { en: 'Simulation', bn: 'সিমুলেশন' },
  'simulation.active': { en: 'Active', bn: 'সক্রিয়' },
  'simulation.paused': { en: 'Paused', bn: 'বিরতি' },
  'sim.console': { en: 'Simulation Console', bn: 'সিমুলেশন কনসোল' },
  'sim.description': { en: 'Toggles device states randomly every 10–30s of simulated time', bn: 'প্রতি ১০-৩০ সেকেন্ড সিমুলেটেড সময়ে এলোমেলোভাবে ডিভাইসের অবস্থা পরিবর্তন করে' },
  'sim.speed': { en: 'Speed', bn: 'গতি' },
  'sim.start': { en: 'Start', bn: 'শুরু' },
  'sim.pause': { en: 'Pause', bn: 'বিরতি' },
  'sim.reset': { en: 'Reset', bn: 'রিসেট' },
  'sim.demo': { en: 'Demo Mode', bn: 'ডেমো মোড' },

  // ─── Office Map ──────────────────────────────────────────
  'office.mapTitle': { en: 'Office Map Architectural Layout', bn: 'অফিস ম্যাপ আর্কিটেকচারাল লেআউট' },
  'office.mapDesc': { en: '2D top-down animated architectural schematic. Click any fan or light bulb directly on the floor plan to toggle power.', bn: '২ডি অ্যানিমেটেড আর্কিটেকচারাল নকশা। লাইভ অন/অফ করতে ফ্যান বা লাইটে ক্লিক করুন।' },
  'office.devicesOn': { en: 'Devices ON', bn: 'ডিভাইস চালু' },
  'map.viewControls': { en: '3D Perspective Controls', bn: '৩ডি পিয়ার্সপেক্টিভ কন্ট্রোল' },
  'map.rotation': { en: '3D Angle', bn: '৩ডি কোণ' },
  'map.tilt': { en: '3D Tilt', bn: '৩ডি টিল্ট' },
  'map.zoom': { en: 'Zoom', bn: 'জুম' },
  'map.presetIso': { en: 'Isometric', bn: 'আইসোমেট্রিক' },
  'map.presetTop': { en: 'Top View', bn: 'ওপরের দৃশ্য' },
  'map.presetSide': { en: 'Side View', bn: 'পার্শ্ব দৃশ্য' },
  'map.autoOrbit': { en: 'Auto-Orbit 3D', bn: 'অটো-অরবিট ৩ডি' },
  'map.legend': { en: 'LEGEND', bn: 'লেজেন্ড' },
  'map.fanPerRoom': { en: 'Fan (2 per room)', bn: 'ফ্যান (রুম প্রতি ২টি)' },
  'map.lightPerRoom': { en: 'Light (3 per room)', bn: 'লাইট (রুম প্রতি ৩টি)' },
  'map.door': { en: 'Door', bn: 'দরজা' },
  'map.window': { en: 'Window', bn: 'জানালা' },
  'map.devicesSummary': { en: 'DEVICES SUMMARY', bn: 'ডিভাইস সারসংক্ষেপ' },
  'map.roomCount': { en: '3 Rooms', bn: '৩টি রুম' },
  'map.fanCount': { en: '2 Fans per room', bn: 'রুম প্রতি ২টি ফ্যান' },
  'map.lightCount': { en: '3 Lights per room', bn: 'রুম প্রতি ৩টি লাইট' },
  'map.totalFans': { en: 'Total Fans: 6', bn: 'মোট ফ্যান: ৬টি' },
  'map.totalLights': { en: 'Total Lights: 9', bn: 'মোট লাইট: ৯টি' },
  'map.totalDevices': { en: 'Total Devices: 15', bn: 'মোট ডিভাইস: ১৫টি' },
  'map.roomUsage': { en: 'ROOM USAGE', bn: 'রুম ব্যবহার' },
  'map.drawingUsage': { en: 'Drawing Room – Waiting area', bn: 'ড্রয়িং রুম – অপেক্ষাগার' },
  'map.work1Usage': { en: 'Work Room 1 – Employees', bn: 'ওয়ার্ক রুম ১ – কর্মী এলাকা' },
  'map.work2Usage': { en: 'Work Room 2 – Employees', bn: 'ওয়ার্ক রুম ২ – কর্মী এলাকা' },
  'map.roomWiseDevices': { en: 'ROOM WISE DEVICES', bn: 'রুম-ভিত্তিক ডিভাইস' },
  'map.entry': { en: 'ENTRY', bn: 'প্রবেশদ্বার' },

  // ─── Rooms ───────────────────────────────────────────────
  'room.drawing': { en: 'Drawing Room', bn: 'ড্রয়িং রুম' },
  'room.work1': { en: 'Work Room 1', bn: 'ওয়ার্ক রুম ১' },
  'room.work2': { en: 'Work Room 2', bn: 'ওয়ার্ক রুম ২' },

  // ─── Devices ─────────────────────────────────────────────
  'device.fans': { en: 'Fans', bn: 'ফ্যান' },
  'device.lights': { en: 'Lights', bn: 'লাইট' },
  'device.fan': { en: 'Fan', bn: 'ফ্যান' },
  'device.light': { en: 'Light', bn: 'লাইট' },
  'device.on': { en: 'ON', bn: 'চালু' },
  'device.off': { en: 'OFF', bn: 'বন্ধ' },
  'device.toggle': { en: 'Toggle', bn: 'টগল' },

  // ─── Power Analytics ─────────────────────────────────────
  'analytics.title': { en: 'Power Analytics', bn: 'পাওয়ার অ্যানালিটিক্স' },
  'analytics.subtitle': { en: 'Energy consumption and load trends', bn: 'শক্তি খরচ ও লোড প্রবণতা' },
  'analytics.totalPower': { en: 'Total Power Draw', bn: 'মোট পাওয়ার ড্র' },
  'analytics.usageToday': { en: 'Usage Today', bn: 'আজকের ব্যবহার' },
  'analytics.co2': { en: 'CO2 Footprint', bn: 'CO2 ফুটপ্রিন্ট' },
  'analytics.grade': { en: 'Building Grade', bn: 'বিল্ডিং গ্রেড' },
  'analytics.gradeLabel': { en: 'Grade', bn: 'গ্রেড' },
  'analytics.roomBreakdown': { en: 'Room Load Breakdown', bn: 'রুম লোড বিভাজন' },
  'analytics.loadCurve': { en: 'Real-time Load Curve (W)', bn: 'রিয়েল-টাইম লোড কার্ভ (W)' },
  'analytics.liveStream': { en: 'Live Streaming', bn: 'লাইভ স্ট্রিমিং' },
  'analytics.awaitingTelemetry': { en: 'Awaiting Telemetry Stream...', bn: 'টেলিমেট্রি স্ট্রিমের অপেক্ষায়...' },

  // ─── Alerts ──────────────────────────────────────────────
  'alerts.title': { en: 'Active Alerts', bn: 'সক্রিয় সতর্কতা' },
  'alerts.count': { en: 'Active', bn: 'সক্রিয়' },
  'alerts.noAlerts': { en: 'All systems nominal.', bn: 'সব সিস্টেম স্বাভাবিক।' },
  'alerts.noAlertsDesc': { en: 'No active alerts detected', bn: 'কোনো সক্রিয় সতর্কতা সনাক্ত হয়নি' },
  'alerts.resolve': { en: 'Resolve', bn: 'সমাধান' },

  // ─── Activity Feed ───────────────────────────────────────
  'activity.title': { en: 'Activity Feed', bn: 'কার্যকলাপ ফিড' },
  'activity.live': { en: 'Live', bn: 'লাইভ' },
  'activity.noEvents': { en: 'Waiting for device activity...', bn: 'ডিভাইস কার্যকলাপের অপেক্ষায়...' },
  'activity.turnedOn': { en: 'turned ON', bn: 'চালু হয়েছে' },
  'activity.turnedOff': { en: 'turned OFF', bn: 'বন্ধ হয়েছে' },

  // ─── Device Management ───────────────────────────────────
  'devices.title': { en: 'Device Management Console', bn: 'ডিভাইস ম্যানেজমেন্ট কনসোল' },
  'devices.subtitle': { en: 'Monitor and control all building devices', bn: 'সব বিল্ডিং ডিভাইস পর্যবেক্ষণ ও নিয়ন্ত্রণ করুন' },
  'devices.totalDevices': { en: 'Total Devices', bn: 'মোট ডিভাইস' },
  'devices.runtime': { en: 'Runtime', bn: 'রানটাইম' },
  'devices.runtimeToday': { en: 'Runtime Today', bn: 'আজকের রানটাইম' },
  'devices.currentSession': { en: 'Current Session', bn: 'বর্তমান সেশন' },
  'devices.powerDraw': { en: 'Power Draw', bn: 'পাওয়ার ড্র' },
  'devices.lastChanged': { en: 'Last Changed', bn: 'সর্বশেষ পরিবর্তন' },
  'devices.status': { en: 'Status', bn: 'স্ট্যাটাস' },
  'devices.room': { en: 'Room', bn: 'রুম' },
  'devices.type': { en: 'Type', bn: 'ধরণ' },
  'devices.name': { en: 'Name', bn: 'নাম' },

  // ─── AI Insights ─────────────────────────────────────────
  'insights.title': { en: 'AI Energy Insights', bn: 'এআই এনার্জি ইনসাইটস' },
  'insights.subtitle': { en: 'Powered by AI analysis engine', bn: 'এআই বিশ্লেষণ ইঞ্জিন দ্বারা চালিত' },
  'insights.summary': { en: 'AI Summary', bn: 'এআই সারাংশ' },
  'insights.efficiency': { en: 'Efficiency Score', bn: 'দক্ষতা স্কোর' },
  'insights.recommendations': { en: 'Recommendations', bn: 'সুপারিশমালা' },
  'insights.anomalies': { en: 'Anomalies', bn: 'অস্বাভাবিকতা' },
  'insights.noAnomalies': { en: 'No anomalies detected', bn: 'কোনো অস্বাভাবিকতা সনাক্ত হয়নি' },
  'insights.potentialSaving': { en: 'Potential Saving', bn: 'সম্ভাব্য সঞ্চয়' },
  'insights.estimatedCost': { en: 'Estimated Daily Cost', bn: 'আনুমানিক দৈনিক খরচ' },
  'insights.peakLoadHour': { en: 'Peak Load Hour', bn: 'সর্বোচ্চ লোড সময়' },
  'insights.costSaving': { en: 'Cost Saving', bn: 'খরচ সঞ্চয়' },
  'insights.loading': { en: 'AI analysis engine processing...', bn: 'এআই বিশ্লেষণ ইঞ্জিন প্রক্রিয়াকরণ চলছে...' },

  // ─── Historical Analytics ────────────────────────────────
  'historical.title': { en: 'Historical Power Analytics', bn: 'ঐতিহাসিক পাওয়ার অ্যানালিটিক্স' },
  'historical.subtitle': { en: 'Trends, comparisons, and actionable insights', bn: 'প্রবণতা, তুলনা এবং কার্যকর ইনসাইটস' },
  'historical.live': { en: 'Live', bn: 'লাইভ' },
  'historical.hour': { en: 'Hour', bn: 'ঘণ্টা' },
  'historical.today': { en: 'Today', bn: 'আজ' },
  'historical.week': { en: 'Week', bn: 'সপ্তাহ' },
  'historical.powerTrend': { en: 'Power Trend', bn: 'পাওয়ার ট্রেন্ড' },
  'historical.roomComparison': { en: 'Room Comparison', bn: 'রুম তুলনা' },
  'historical.deviceBreakdown': { en: 'Device Type Breakdown', bn: 'ডিভাইস ধরণ বিভাজন' },
  'historical.deviceUptime': { en: 'Device Uptime Report', bn: 'ডিভাইস আপটাইম রিপোর্ট' },
  'historical.hourlyIntensity': { en: 'Hourly Intensity Grid', bn: 'ঘণ্টাভিত্তিক তীব্রতা গ্রিড' },
  'historical.noData': { en: 'Collecting data...', bn: 'ডেটা সংগ্রহ করা হচ্ছে...' },
  'historical.fanUsage': { en: 'Fans', bn: 'ফ্যান' },
  'historical.lightUsage': { en: 'Lights', bn: 'লাইট' },
  'historical.avgPower': { en: 'Avg Power', bn: 'গড় পাওয়ার' },
  'historical.peakPower': { en: 'Peak Power', bn: 'সর্বোচ্চ পাওয়ার' },
  'historical.minPower': { en: 'Min Power', bn: 'সর্বনিম্ন পাওয়ার' },
  'historical.totalEnergy': { en: 'Total Energy', bn: 'মোট শক্তি' },
  'historical.estimatedCost': { en: 'Estimated Cost', bn: 'আনুমানিক খরচ' },

  // ─── Automation ──────────────────────────────────────────
  'auto.title': { en: 'Smart Automation', bn: 'স্মার্ট অটোমেশন' },
  'auto.subtitle': { en: 'Intelligent energy management & device control', bn: 'বুদ্ধিমান শক্তি ব্যবস্থাপনা ও ডিভাইস নিয়ন্ত্রণ' },
  'auto.enabled': { en: 'Active', bn: 'সক্রিয়' },
  'auto.disabled': { en: 'Paused', bn: 'বিরতি' },
  'auto.undo': { en: 'Undo', bn: 'পূর্বাবস্থা' },
  'auto.rules': { en: 'Automation Rules', bn: 'অটোমেশন নিয়মাবলী' },
  'auto.newRule': { en: 'New Rule', bn: 'নতুন নিয়ম' },
  'auto.cancel': { en: 'Cancel', bn: 'বাতিল' },
  'auto.activityLog': { en: 'Automation Activity Log', bn: 'অটোমেশন কার্যকলাপ লগ' },
  'auto.events': { en: 'events', bn: 'ইভেন্টস' },
  'auto.occupancy': { en: 'Room Occupancy Sensors', bn: 'রুম অকুপেন্সি সেন্সর' },
  'auto.occupied': { en: 'Occupied', bn: 'দখলকৃত' },
  'auto.empty': { en: 'Empty', bn: 'খালি' },
  'auto.createRule': { en: 'Create Rule', bn: 'নিয়ম তৈরি করুন' },
  'auto.updateRule': { en: 'Update Rule', bn: 'নিয়ম আপডেট করুন' },
  'auto.editRule': { en: 'Edit Rule', bn: 'নিয়ম সম্পাদনা' },
  'auto.createNewRule': { en: 'Create New Rule', bn: 'নতুন নিয়ম তৈরি করুন' },
  'auto.rulePreview': { en: 'RULE PREVIEW', bn: 'নিয়ম প্রিভিউ' },
  'auto.noRules': { en: 'No automation rules configured. Click "New Rule" to get started.', bn: 'কোনো অটোমেশন নিয়ম কনফিগার করা হয়নি। শুরু করতে "নতুন নিয়ম" ক্লিক করুন।' },
  'auto.noEvents': { en: 'No automation events yet. The engine will log actions here as rules trigger.', bn: 'এখনো কোনো অটোমেশন ইভেন্ট নেই। নিয়ম ট্রিগার হলে ইঞ্জিন এখানে অ্যাকশন লগ করবে।' },

  // ─── Automation Form Labels ──────────────────────────────
  'form.name': { en: 'Name', bn: 'নাম' },
  'form.trigger': { en: 'Trigger', bn: 'ট্রিগার' },
  'form.operator': { en: 'Operator', bn: 'অপারেটর' },
  'form.timeBased': { en: 'Time-Based', bn: 'সময়-ভিত্তিক' },
  'form.idleDuration': { en: 'Idle Duration', bn: 'নিষ্ক্রিয় সময়কাল' },
  'form.occupancy': { en: 'Occupancy', bn: 'অকুপেন্সি' },
  'form.greaterThan': { en: 'Greater Than', bn: 'বেশি' },
  'form.lessThan': { en: 'Less Than', bn: 'কম' },
  'form.equals': { en: 'Equals', bn: 'সমান' },
  'form.room': { en: 'Room (optional)', bn: 'রুম (ঐচ্ছিক)' },
  'form.anyRoom': { en: 'Any Room', bn: 'যেকোনো রুম' },
  'form.target': { en: 'Target', bn: 'টার্গেট' },
  'form.allLights': { en: 'All Lights', bn: 'সব লাইট' },
  'form.allFans': { en: 'All Fans', bn: 'সব ফ্যান' },
  'form.action': { en: 'Action', bn: 'অ্যাকশন' },
  'form.turnOff': { en: 'Turn OFF', bn: 'বন্ধ করুন' },
  'form.turnOn': { en: 'Turn ON', bn: 'চালু করুন' },
  'form.priority': { en: 'Priority', bn: 'অগ্রাধিকার' },
  'form.high': { en: 'High', bn: 'উচ্চ' },
  'form.medium': { en: 'Medium', bn: 'মাঝারি' },
  'form.low': { en: 'Low', bn: 'নিম্ন' },
  'form.time': { en: 'Time (HH:MM)', bn: 'সময় (ঘণ্টা:মিনিট)' },
  'form.minutes': { en: 'Minutes', bn: 'মিনিট' },

  // ─── Mode Names ──────────────────────────────────────────
  'mode.normal': { en: 'Normal', bn: 'সাধারণ' },
  'mode.eco': { en: 'Eco', bn: 'ইকো' },
  'mode.night': { en: 'Night', bn: 'রাত' },
  'mode.vacation': { en: 'Vacation', bn: 'ছুটি' },
  'mode.normal.desc': { en: 'Standard operation', bn: 'স্বাভাবিক পরিচালনা' },
  'mode.eco.desc': { en: 'Reduce consumption', bn: 'ব্যবহার কমানো' },
  'mode.night.desc': { en: 'After-hours shutdown', bn: 'অফিস-পরবর্তী শাটডাউন' },
  'mode.vacation.desc': { en: 'Full building shutdown', bn: 'সম্পূর্ণ বিল্ডিং বন্ধ' },

  // ─── Stats ───────────────────────────────────────────────
  'stats.actionsToday': { en: 'Actions Today', bn: 'আজকের অ্যাকশন' },
  'stats.kwhSaved': { en: 'kWh Saved', bn: 'kWh সেভ' },
  'stats.devicesOff': { en: 'Devices Off', bn: 'বন্ধ ডিভাইস' },
  'stats.topRule': { en: 'Top Rule', bn: 'শীর্ষ নিয়ম' },
  'stats.successRate': { en: 'Success Rate', bn: 'সাফল্যের হার' },
  'stats.powerSaved': { en: 'Power Saved', bn: 'শক্তি সঞ্চিত' },

  // ─── AI Chat ─────────────────────────────────────────────
  'chat.title': { en: 'AI Operations Assistant', bn: 'এআই অপারেশন সহকারী' },
  'chat.subtitle': { en: 'Ask anything about your smart office', bn: 'আপনার স্মার্ট অফিস সম্পর্কে যেকোনো কিছু জিজ্ঞাসা করুন' },
  'chat.placeholder': { en: 'Ask about power usage, costs, efficiency...', bn: 'পাওয়ার ব্যবহার, খরচ, দক্ষতা সম্পর্কে জিজ্ঞাসা করুন...' },
  'chat.send': { en: 'Send', bn: 'পাঠান' },
  'chat.clear': { en: 'Clear Chat', bn: 'চ্যাট মুছুন' },
  'chat.thinking': { en: 'Thinking...', bn: 'ভাবছে...' },
  'chat.greeting': { en: "Hi! I'm EBot, your AI office assistant. Ask me anything about power consumption, device statuses, or energy savings!", bn: 'হ্যালো! আমি ইবট, আপনার এআই অফিস সহকারী। পাওয়ার খরচ, ডিভাইসের অবস্থা বা শক্তি সঞ্চয় সম্পর্কে আমাকে যেকোনো কিছু জিজ্ঞাসা করুন!' },

  // ─── Sidebar Navigation ──────────────────────────────────
  'nav.dashboard': { en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
  'nav.simulation': { en: 'Simulation', bn: 'সিমুলেশন' },
  'nav.officeMap': { en: 'Office Map', bn: 'অফিস ম্যাপ' },
  'nav.aiInsights': { en: 'AI Insights', bn: 'এআই ইনসাইটস' },
  'nav.analytics': { en: 'Analytics', bn: 'অ্যানালিটিক্স' },
  'nav.historical': { en: 'Historical', bn: 'ঐতিহাসিক' },
  'nav.automation': { en: 'Automation', bn: 'অটোমেশন' },
  'nav.devices': { en: 'Devices', bn: 'ডিভাইস' },

  // ─── Common ──────────────────────────────────────────────
  'common.if': { en: 'IF', bn: 'যদি' },
  'common.then': { en: 'THEN', bn: 'তাহলে' },
  'common.in': { en: 'in', bn: 'এ' },
  'common.powerSaved': { en: 'Power Saved', bn: 'শক্তি সঞ্চিত' },
  'common.currency': { en: 'Tk ', bn: '৳ ' },
};

interface LanguageContextValue {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  toggleLanguage: () => {},
  t: (key: string) => key
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('iot-lang');
    return (saved === 'bn' ? 'bn' : 'en') as Language;
  });

  useEffect(() => {
    localStorage.setItem('iot-lang', language);
  }, [language]);

  const toggleLanguage = () => setLanguage((prev) => (prev === 'en' ? 'bn' : 'en'));

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || entry['en'] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
