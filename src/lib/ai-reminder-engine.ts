import { AIReminderExtraction } from "./types";
import { toTimezoneIso, getWallClockInTimezone, addCalendarDaysInTimezone } from "./date-utils";

export type SupportedLanguage = "English" | "Gujarati" | "Hindi";

interface GroupContext {
  id: string;
  name: string;
}

interface ParseOptions {
  userPrompt: string;
  existingGroups: GroupContext[];
  userTimezone?: string;
  currentDate?: Date;
  targetLanguage?: string;
  selectedGroupId?: string;
}

/**
 * Normalizes language name to one of the 3 supported options:
 * "English", "Gujarati", or "Hindi".
 */
export function normalizeLanguage(lang?: string | null): SupportedLanguage {
  if (!lang) return "English";
  const lower = lang.toLowerCase().trim();
  if (
    lower === "gu" ||
    lower.startsWith("gu") ||
    lower.includes("guj") ||
    lower.includes("ગુજરાતી") ||
    /[\u0A80-\u0AFF]/.test(lang)
  ) {
    return "Gujarati";
  }
  if (
    lower === "hi" ||
    lower.startsWith("hi") ||
    lower.includes("hin") ||
    lower.includes("हिंदी") ||
    lower.includes("हिन्दी") ||
    /[\u0900-\u097F]/.test(lang)
  ) {
    return "Hindi";
  }
  return "English";
}

/**
 * Intelligent AI Reminder Builder engine.
 * Supports Google Gemini API, OpenAI API, and an intelligent built-in NLP engine
 * for zero-dependency operation when API keys are not provided.
 */
export async function parseReminderPrompt({
  userPrompt,
  existingGroups,
  userTimezone = "Asia/Kolkata",
  currentDate = new Date(),
  targetLanguage,
  selectedGroupId,
}: ParseOptions): Promise<AIReminderExtraction> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Determine effective target language
  const effectiveLanguage = targetLanguage
    ? normalizeLanguage(targetLanguage)
    : detectLanguageFromPrompt(userPrompt);

  if (geminiKey && geminiKey.trim() !== "your-gemini-api-key-here" && geminiKey.trim() !== "") {
    try {
      const result = await parseWithGemini(
        userPrompt,
        existingGroups,
        userTimezone,
        currentDate,
        effectiveLanguage,
        geminiKey
      );
      if (result) return result;
    } catch (err) {
      console.warn("Gemini API call failed, falling back to built-in NLP engine:", err);
    }
  } else if (openaiKey && openaiKey.trim() !== "your-openai-api-key-here" && openaiKey.trim() !== "") {
    try {
      const result = await parseWithOpenAI(
        userPrompt,
        existingGroups,
        userTimezone,
        currentDate,
        effectiveLanguage,
        openaiKey
      );
      if (result) return result;
    } catch (err) {
      console.warn("OpenAI API call failed, falling back to built-in NLP engine:", err);
    }
  }

  // Built-in intelligent NLP fallback
  return parseWithBuiltInEngine(
    userPrompt,
    existingGroups,
    userTimezone,
    currentDate,
    effectiveLanguage,
    selectedGroupId
  );
}

function detectLanguageFromPrompt(prompt: string): SupportedLanguage {
  const p = prompt.trim();
  const lower = p.toLowerCase();
  if (lower.includes("gujarati") || /[\u0A80-\u0AFF]/.test(p)) {
    return "Gujarati";
  }
  if (lower.includes("hindi") || /[\u0900-\u097F]/.test(p)) {
    return "Hindi";
  }
  return "English";
}

/**
 * Built-in Rule and Pattern NLP Engine.
 * Extracts intent, date, time, group, language, and variables without hallucinating.
 * Generates natural full-text messages in English, Gujarati script, or Hindi script.
 */
export function parseWithBuiltInEngine(
  prompt: string,
  existingGroups: GroupContext[],
  timezone: string,
  now: Date,
  requestedLanguage?: string,
  selectedGroupId?: string
): AIReminderExtraction {
  const p = prompt.trim();
  const lower = p.toLowerCase();
  const missingInfo: string[] = [];

  // 1. Language determination
  const language: SupportedLanguage = requestedLanguage
    ? normalizeLanguage(requestedLanguage)
    : detectLanguageFromPrompt(p);

  // 2. Audience / Group matching
  let promptMatchedGroup: GroupContext | undefined;
  let promptMentionedName = "";
  let promptMatchedExact = false;

  // Direct check against existing group names
  for (const group of existingGroups) {
    const gNameLower = group.name.toLowerCase();
    if (lower.includes(gNameLower)) {
      promptMatchedGroup = group;
      promptMentionedName = group.name;
      promptMatchedExact = true;
      break;
    }
  }

  // Multilingual and alias matching for each existing group
  if (!promptMatchedGroup) {
    for (const group of existingGroups) {
      const gLower = group.name.toLowerCase();
      const aliases: string[] = [];

      if (gLower.includes("10") || gLower.includes("math")) {
        aliases.push(
          "class 10", "maths", "math", "cbse maths",
          "ક્લાસ 10", "ગણિત", "કક્ષા 10", "ધોરણ 10", "10મુ",
          "कक्षा 10", "दसवीं", "गणित", "मैथ्स", "मैथ"
        );
      }
      if (gLower.includes("12") || gLower.includes("physic")) {
        aliases.push(
          "class 12", "physics", "cbse physics",
          "ક્લાસ 12", "ભૌતિક", "ભૌતિક વિજ્ઞાન", "કક્ષા 12", "ધોરણ 12", "12મુ",
          "कक्षा 12", "बारहवीं", "भौतिक", "भौतिकी"
        );
      }
      if (gLower.includes("parent") || gLower.includes("council")) {
        aliases.push(
          "parent", "parents", "parent council",
          "વાલી", "વાલીઓ", "વાલી મંડળ", "વાલી કાઉન્સિલ", "માતાપિતા",
          "अभिभावक", "माता-पिता", "पेरेंट्स", "पैरेंट्स", "पालक"
        );
      }
      if (gLower.includes("robot")) {
        aliases.push(
          "robotics", "robot", "robotics club", "weekend robotics",
          "રોબોટિક્સ", "રોબોટ", "રોબોટિક્સ ક્લબ",
          "रोबोटिक्स", "रोबोट", "रोबोटिक्स क्लब"
        );
      }
      if (gLower.includes("student")) {
        aliases.push(
          "students", "student",
          "વિદ્યાર્થી", "વિદ્યાર્થીઓ", "વિદ્યાર્થી ગ્રૂપ",
          "छात्र", "छात्रों", "विद्यार्थी"
        );
      }

      for (const alias of aliases) {
        if (lower.includes(alias.toLowerCase())) {
          promptMatchedGroup = group;
          promptMentionedName = group.name;
          promptMatchedExact = true;
          break;
        }
      }
      if (promptMatchedGroup) break;
    }
  }

  // Check generic audience keywords if no existing group matched
  if (!promptMatchedGroup) {
    const genericAudienceMap: Array<{ keywords: string[]; name: string }> = [
      {
        keywords: ["students", "student", "વિદ્યાર્થીઓ", "વિદ્યાર્થી", "छात्र", "छात्रों"],
        name: "Students",
      },
      {
        keywords: ["parents", "parent", "વાલીઓ", "વાલી", "अभिभावक", "माता-पिता", "पेरेंट्स"],
        name: "Parents",
      },
      {
        keywords: ["teachers", "teacher", "શિક્ષકો", "શિક્ષક", "शिक्षक", "शिक्षकों"],
        name: "Teachers",
      },
      {
        keywords: ["members", "સભ્યો", "सदस्य"],
        name: "Members",
      },
      {
        keywords: ["customers", "clients", "ગ્રાહકો", "ग्राहक"],
        name: "Customers",
      },
      {
        keywords: ["staff", "સ્ટાફ", "कर्मचारी"],
        name: "Staff",
      },
      {
        keywords: ["batch a", "બેચ એ", "बैच ए"],
        name: "Batch A",
      },
      {
        keywords: ["batch b", "બેચ બી", "बैच बी"],
        name: "Batch B",
      },
      {
        keywords: ["class 10", "ક્લાસ 10", "ધોરણ 10", "कक्षा 10"],
        name: "Class 10",
      },
      {
        keywords: ["class 12", "ક્લાસ 12", "ધોરણ 12", "कक्षा 12"],
        name: "Class 12",
      },
      {
        keywords: ["vip", "વીઆઇપી", "वीआईपी"],
        name: "VIP",
      },
    ];

    for (const item of genericAudienceMap) {
      for (const kw of item.keywords) {
        if (lower.includes(kw.toLowerCase())) {
          promptMentionedName = item.name;
          const partial = existingGroups.find((g) =>
            g.name.toLowerCase().includes(item.name.toLowerCase())
          );
          if (partial) {
            promptMatchedGroup = partial;
            promptMentionedName = partial.name;
            promptMatchedExact = true;
          }
          break;
        }
      }
      if (promptMentionedName) break;
    }
  }

  // Reconcile prompt-detected audience with explicitly selected group
  const manuallySelectedGroup = selectedGroupId
    ? existingGroups.find((g) => g.id === selectedGroupId)
    : undefined;

  let targetGroupName = "";
  let targetGroupId: string | undefined;
  let matchedExact = false;
  let hasAudienceConflict = false;
  let audienceConflictWarning: string | undefined;

  if (manuallySelectedGroup && promptMatchedGroup && manuallySelectedGroup.id !== promptMatchedGroup.id) {
    // Conflict between prompt instruction and user's selected dropdown
    hasAudienceConflict = true;
    targetGroupName = manuallySelectedGroup.name;
    targetGroupId = manuallySelectedGroup.id;
    matchedExact = false;
    audienceConflictWarning = `Audience conflict: Your prompt instruction mentions "${promptMatchedGroup.name}", but "${manuallySelectedGroup.name}" is selected in the Audience Group dropdown. Please confirm your desired target group.`;
    missingInfo.push(audienceConflictWarning);
  } else if (manuallySelectedGroup) {
    // Explicit selection is authoritative when no conflicting group in prompt
    targetGroupName = manuallySelectedGroup.name;
    targetGroupId = manuallySelectedGroup.id;
    matchedExact = true;
  } else if (promptMatchedGroup) {
    targetGroupName = promptMatchedGroup.name;
    targetGroupId = promptMatchedGroup.id;
    matchedExact = true;
  } else if (promptMentionedName) {
    targetGroupName = promptMentionedName;
    matchedExact = false;
    missingInfo.push(`Audience group "${promptMentionedName}" was mentioned but does not exist in your groups yet. Please select an existing group or create it in Contacts.`);
  } else {
    targetGroupName = "Unspecified Audience";
    matchedExact = false;
    missingInfo.push("No recipient group detected in your instruction. Please select an audience group below.");
  }

  // 3. Date & Time extraction (computed in target IANA timezone so cloud UTC servers resolve exact local dates)
  const wallClockNow = getWallClockInTimezone(now, timezone);
  let dayOffset = 0;
  let dateFound = false;
  let timeFound = false;

  // Day offset
  if (lower.includes("tomorrow") || lower.includes("આવતીકાલે") || lower.includes("कल")) {
    dayOffset = 1;
    dateFound = true;
  } else if (lower.includes("today") || lower.includes("આજે") || lower.includes("आज")) {
    dayOffset = 0;
    dateFound = true;
  } else if (lower.includes("day after tomorrow") || lower.includes("પરમદિવસે") || lower.includes("परसों")) {
    dayOffset = 2;
    dateFound = true;
  } else {
    // Check specific days like "monday", "friday"
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        const currentDay = wallClockNow.dayOfWeek;
        let diff = i - currentDay;
        if (diff <= 0) diff += 7; // next occurrence
        dayOffset = diff;
        dateFound = true;
        break;
      }
    }
  }

  // Time detection: e.g., "10 am", "10:30 am", "5 pm", "14:00"
  const timeMatch = lower.match(/(?:at\s+)?(\b\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);

  let hours = 10; // default 10:00
  let minutes = 0;

  if (timeMatch) {
    timeFound = true;
    hours = parseInt(timeMatch[1], 10);
    minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridiem = timeMatch[3].toLowerCase();

    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
  } else {
    // 24hr check (e.g., at 16:00 or 10:00)
    const time24Match = lower.match(/(?:at\s+)?(\b\d{1,2}):(\d{2})\b/);
    if (time24Match) {
      timeFound = true;
      hours = parseInt(time24Match[1], 10);
      minutes = parseInt(time24Match[2], 10);
    } else {
      // Check for simple hour specification like "10 વાગ્યે" or "10 बजे" or "10 AM"
      const simpleHourMatch = lower.match(/(\b\d{1,2})\s*(?:વાગ્યે|बजे|am|pm)/i);
      if (simpleHourMatch) {
        timeFound = true;
        hours = parseInt(simpleHourMatch[1], 10);
        if (lower.includes("pm") && hours < 12) hours += 12;
      }
    }
  }

  if (!dateFound) {
    dayOffset = 1;
    missingInfo.push("Specific date was not specified; defaulted to tomorrow. Please verify the scheduled date.");
  }
  if (!timeFound) {
    missingInfo.push("Specific time was not specified; defaulted to 10:00 AM. Please verify the scheduled time.");
  }

  const scheduledDate = addCalendarDaysInTimezone(now, dayOffset, timezone);
  const scheduledTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  // 4. Intent & Topic detection with complete multilingual message generation
  let sampleMessage = "";
  const variables = ["name"];

  const isFee =
    lower.includes("fee") ||
    lower.includes("fees") ||
    lower.includes("payment") ||
    lower.includes("dues") ||
    lower.includes("ફી") ||
    lower.includes("फीस") ||
    lower.includes("शुल्क");

  const isMeeting =
    lower.includes("meeting") ||
    lower.includes("ptm") ||
    lower.includes("parent-teacher") ||
    lower.includes("વાલી") ||
    lower.includes("મીટિંગ") ||
    lower.includes("बैठक");

  const isAttendance =
    lower.includes("attendance") ||
    lower.includes("absent") ||
    lower.includes("હાજરી") ||
    lower.includes("ગેરહાજર") ||
    lower.includes("अनुपस्थित") ||
    lower.includes("उपस्थिति");

  const isHoliday =
    lower.includes("holiday") ||
    lower.includes("closed") ||
    lower.includes("vacation") ||
    lower.includes("રજા") ||
    lower.includes("બંધ") ||
    lower.includes("अवकाश") ||
    lower.includes("छुट्टी");

  let campaignTypeEn = "Reminder";
  let campaignTypeLocal = "Reminder";

  if (isFee) {
    campaignTypeEn = "Fee Reminder";
    variables.push("fee_amount", "due_date");

    if (language === "Gujarati") {
      campaignTypeLocal = "ફી રીમાઇન્ડર";
      sampleMessage =
        "નમસ્તે {{name}}, RemindFlow AI તરફથી નમ્ર યાદ અપાવવામાં આવે છે કે તમારી બાકી ફી {{fee_amount}} ભરવાની છેલ્લી તારીખ {{due_date}} છે. કૃપા કરીને સમયસર ફી જમા કરાવો. આભાર!";
    } else if (language === "Hindi") {
      campaignTypeLocal = "फीस रिमाइंडर";
      sampleMessage =
        "नमस्ते {{name}}, यह RemindFlow AI की ओर से एक विनम्र स्मरण पत्र है कि आपकी देय फीस {{fee_amount}} का भुगतान {{due_date}} तक अपेक्षित है। कृपया समय पर भुगतान सुनिश्चित करें। धन्यवाद!";
    } else {
      campaignTypeLocal = "Fee Reminder";
      sampleMessage =
        "Dear {{name}}, this is a friendly reminder from your academy that your upcoming fee of {{fee_amount}} is due on {{due_date}}. Please complete the payment at your earliest convenience. Thank you!";
    }
  } else if (isMeeting) {
    campaignTypeEn = "Meeting Notification";
    variables.push("meeting_time");

    if (language === "Gujarati") {
      campaignTypeLocal = "મીટિંગ સૂચના";
      sampleMessage =
        "નમસ્તે {{name}}, આગામી વાલી-શિક્ષક મીટિંગ (PTM) સંદર્ભે સૂચના. કૃપા કરીને નિર્ધારિત સમય {{meeting_time}} વાગ્યે તમારી ઉપસ્થિતિ સુનિશ્ચિત કરો. આભાર!";
    } else if (language === "Hindi") {
      campaignTypeLocal = "मीटिंग सूचना";
      sampleMessage =
        "नमस्ते {{name}}, आगामी अभिभावक-शिक्षक बैठक (PTM) के संबंध में सूचना। कृपया निर्धारित समय {{meeting_time}} पर अपनी उपस्थिति सुनिश्चित करें। धन्यवाद!";
    } else {
      campaignTypeLocal = "Meeting Notification";
      sampleMessage =
        "Dear {{name}}, this is to invite you to our upcoming Parent-Teacher Meeting (PTM) scheduled for {{meeting_time}}. Your presence is requested. Thank you!";
    }
  } else if (isAttendance) {
    campaignTypeEn = "Attendance Alert";
    variables.push("date");

    if (language === "Gujarati") {
      campaignTypeLocal = "હાજરી એલર્ટ";
      sampleMessage =
        "નમસ્તે {{name}}, અમારા રેકોર્ડ મુજબ તમે આજના સત્ર ({{date}}) માં ગેરહાજર રહ્યા છો. જો કોઈ પ્રશ્ન હોય તો કૃપા કરીને સંયોજકનો સંપર્ક કરો.";
    } else if (language === "Hindi") {
      campaignTypeLocal = "उपस्थिति अलर्ट";
      sampleMessage =
        "नमस्ते {{name}}, हमारे रिकॉर्ड के अनुसार आप आज के सत्र ({{date}}) में अनुपस्थित थे। यदि कोई प्रश्न हो तो कृपया समन्वयक से संपर्क करें।";
    } else {
      campaignTypeLocal = "Attendance Alert";
      sampleMessage =
        "Dear {{name}}, our records indicate absence for today's session ({{date}}). Kindly reach out to the coordinator if you have any questions.";
    }
  } else if (isHoliday) {
    campaignTypeEn = "Holiday Announcement";

    if (language === "Gujarati") {
      campaignTypeLocal = "રજાની જાહેરાત";
      sampleMessage =
        "નમસ્તે {{name}}, કૃપા કરીને નોંધ લેશો કે રજા હોવાને કારણે આવતીકાલે સંસ્થા બંધ રહેશે. ત્યારબાદ નિયમિત સત્રો રાબેતા મુજબ શરૂ થશે.";
    } else if (language === "Hindi") {
      campaignTypeLocal = "अवकाश सूचना";
      sampleMessage =
        "नमस्ते {{name}}, कृपया ध्यान दें कि निर्धारित अवकाश के कारण केंद्र कल बंद रहेगा। इसके पश्चात कक्षाएं नियमित रूप से जारी रहेंगी।";
    } else {
      campaignTypeLocal = "Holiday Announcement";
      sampleMessage =
        "Dear {{name}}, please note that the centre will remain closed tomorrow on account of the scheduled holiday. Regular sessions resume thereafter.";
    }
  } else {
    campaignTypeEn = "General Reminder";

    if (language === "Gujarati") {
      campaignTypeLocal = "સામાન્ય રીમાઇન્ડર";
      sampleMessage =
        "નમસ્તે {{name}}, આ તમારા આગામી કાર્યક્રમ અંગે એક મહત્વપૂર્ણ યાદ અપાવતો સંદેશ છે. જો તમારે કોઈ સહાયની જરૂર હોય તો કૃપા કરીને અમારો સંપર્ક કરો.";
    } else if (language === "Hindi") {
      campaignTypeLocal = "सामान्य रिमाइंडर";
      sampleMessage =
        "नमस्ते {{name}}, यह आपके आगामी कार्यक्रम के संबंध में एक महत्वपूर्ण सूचना है। यदि आपको किसी सहायता की आवश्यकता हो तो कृपया हमें बताएं।";
    } else {
      campaignTypeLocal = "General Reminder";
      sampleMessage =
        "Dear {{name}}, this is an important reminder regarding your upcoming schedule with us. Please let us know if you need any assistance.";
    }
  }

  const languageLabel =
    language === "Gujarati"
      ? "ગુજરાતી"
      : language === "Hindi"
      ? "हिंदी"
      : "English";

  const campaignName = `${targetGroupName ? targetGroupName + " - " : ""}${campaignTypeLocal} (${languageLabel})`;

  return {
    campaignName,
    targetGroup: targetGroupName,
    targetGroupId,
    matchedGroupExact: matchedExact,
    message: sampleMessage,
    language,
    scheduledDate,
    scheduledTime,
    timezone,
    scheduledIsoString: toTimezoneIso(scheduledDate, scheduledTime, timezone),
    variables,
    missingInformation: missingInfo,
    isDemoMode: true,
    aiProviderName: "Built-in NLP Engine (Demo Mode)",
    explanation: `Generated in ${languageLabel} by RemindFlow Built-in NLP parser. Fully editable in all fields.`,
    hasAudienceConflict,
    audienceConflictWarning,
  };
}

/**
 * Gemini API Structured Parser
 */
async function parseWithGemini(
  prompt: string,
  existingGroups: GroupContext[],
  timezone: string,
  now: Date,
  targetLanguage: SupportedLanguage,
  apiKey: string
): Promise<AIReminderExtraction | null> {
  const groupsList = existingGroups.map((g) => `"${g.name}" (id: ${g.id})`).join(", ");
  const currentDateStr = now.toISOString();

  const systemInstruction = `You are the RemindFlow AI Reminder Extraction Assistant.
Current reference time: ${currentDateStr} in timezone "${timezone}".
Available audience groups in user's database: [${groupsList}].
Target Language explicitly requested: "${targetLanguage}".

CRITICAL LANGUAGE REQUIREMENT:
The user explicitly selected language "${targetLanguage}".
You MUST generate the entire "message" field in natural ${targetLanguage} script:
- If "English": write the entire message in natural English.
- If "Gujarati": write the entire message in natural Gujarati script (ગુજરાતી લિપિ). Do NOT output Romanized Gujarati.
- If "Hindi": write the entire message in natural Hindi script (देवनागरी लिपि). Do NOT output Romanized Hindi.
The "language" property in your JSON output must be "${targetLanguage}".

Extract these fields strictly as valid JSON without markdown wrapping:
{
  "campaignName": "string",
  "targetGroup": "string (name of audience group)",
  "targetGroupId": "string or null",
  "matchedGroupExact": boolean,
  "message": "string (ready-to-send template in ${targetLanguage} script with double-curly-braces variables like {{name}})",
  "language": "${targetLanguage}",
  "scheduledDate": "YYYY-MM-DD",
  "scheduledTime": "HH:mm (24 hour format)",
  "timezone": "${timezone}",
  "scheduledIsoString": "ISO8601 string",
  "variables": ["string", "string"],
  "missingInformation": ["string explaining any unclear or missing details"],
  "explanation": "string explaining reasoning"
}
Rules:
1. Do NOT silently hallucinate groups or dates that were completely unmentioned. List any missing items in missingInformation.
2. The entire message MUST be in ${targetLanguage}.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemInstruction },
              { text: `Instruction to parse: "${prompt}". Requested language: "${targetLanguage}".` },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    }
  );

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  const parsed = JSON.parse(text);
  return {
    ...parsed,
    language: targetLanguage,
    isDemoMode: false,
    aiProviderName: "Google Gemini 1.5 Flash",
  };
}

/**
 * OpenAI API Structured Parser
 */
async function parseWithOpenAI(
  prompt: string,
  existingGroups: GroupContext[],
  timezone: string,
  now: Date,
  targetLanguage: SupportedLanguage,
  apiKey: string
): Promise<AIReminderExtraction | null> {
  const groupsList = existingGroups.map((g) => `"${g.name}" (id: ${g.id})`).join(", ");

  const systemPrompt = `You are RemindFlow AI reminder extraction. Current reference time: ${now.toISOString()} in timezone ${timezone}. Existing groups: [${groupsList}].
Target Language explicitly requested: "${targetLanguage}".
CRITICAL LANGUAGE REQUIREMENT:
You MUST generate the entire "message" field in natural ${targetLanguage} script:
- If "English": write the entire message in natural English.
- If "Gujarati": write the entire message in natural Gujarati script (ગુજરાતી લિપિ).
- If "Hindi": write the entire message in natural Hindi script (देवनागरी लिपि).
The "language" property must be "${targetLanguage}".
Return structured JSON with: campaignName, targetGroup, targetGroupId, matchedGroupExact, message, language, scheduledDate (YYYY-MM-DD), scheduledTime (HH:mm), timezone, scheduledIsoString, variables, missingInformation (array of strings for missing details), explanation.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Instruction: "${prompt}". Target Language: "${targetLanguage}".`,
        },
      ],
    }),
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  const parsed = JSON.parse(content);
  return {
    ...parsed,
    language: targetLanguage,
    isDemoMode: false,
    aiProviderName: "OpenAI GPT-4o-mini",
  };
}
