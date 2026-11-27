// Interface strings shared by every academy. Arabic is the default; every key has [Arabic, English].
// An academy adds or overrides keys through config.dict (same [ar, en] shape) and the {academy} placeholder
// is filled with its short name.
const BASE = {
  productOf: ["من منتجات البشرى للتكنولوجيا", "An Albushra Technology product"],
  searchPh: ["ابحث عن كلمة أو درس…", "Search a word or lesson…"],
  switchLang: ["English", "عربي"], language: ["اللغة", "Language"], theme: ["المظهر", "Theme"],
  nav_home: ["لوحتي", "Dashboard"], nav_path: ["المنهج", "Curriculum"], nav_vocab: ["المفردات", "Vocabulary"],
  nav_grammar: ["القواعد", "Grammar"], nav_dialogues: ["المحادثات", "Conversations"], nav_studio: ["استوديو النطق", "Pronunciation studio"],
  nav_tutor: ["المعلّم الذكي", "AI tutor"], nav_tests: ["الاختبارات والشهادات", "Tests & certificates"], nav_profile: ["ملفي", "Profile"],
  nav_admin: ["الإدارة", "Admin"], bn_studio: ["النطق", "Studio"], bn_path: ["المنهج", "Course"], bn_home: ["لوحتي", "Home"],
  otherAcademies: ["أكاديميات البشرى", "Albushra academies"], privacy: ["سياسة الخصوصية", "Privacy policy"],
  loading: ["جارٍ التحميل…", "Loading…"], error: ["حدث خطأ أثناء التحميل.", "Something went wrong."], tryAgain: ["حاول مجددًا", "Try again"],
  notFound: ["الصفحة غير موجودة.", "Page not found."], offline: ["أنت غير متصل. المحتوى المحفوظ ما زال متاحًا.", "You are offline. Saved content still works."],
  // dashboard
  welcome: ["أهلًا بعودتك", "Welcome back"], welcomeNew: ["أهلًا بك في", "Welcome to"], continue: ["تابع التعلّم", "Continue learning"],
  start: ["ابدأ من الصفر", "Start from zero"], nextLesson: ["الدرس المقترح التالي", "Recommended next lesson"],
  yourLevel: ["مستواك", "Your level"], dailyGoal: ["هدف اليوم", "Daily goal"], xp: ["نقطة", "XP"], goalDone: ["حقّقت هدف اليوم!", "Daily goal reached!"],
  lessonsDone: ["دروس مكتملة", "Lessons completed"], wordsLearned: ["كلمات محفوظة", "Words saved"], pronScore: ["دقة النطق", "Pronunciation"],
  quizAvg: ["متوسط الاختبارات", "Quiz average"], streak: ["سلسلة التعلّم", "Learning streak"], days: ["أيام", "days"], day: ["يوم", "day"],
  overall: ["التقدّم العام", "Overall progress"], wordOfDay: ["كلمة اليوم", "Word of the day"], quick: ["اختصارات", "Shortcuts"],
  reviewWords: ["راجع كلماتك", "Review words"], openStudio: ["افتح استوديو النطق", "Open the studio"], askTutor: ["اسأل المعلّم", "Ask the tutor"],
  takeTest: ["اختبر مستواك", "Take a level test"], of: ["من", "of"], notRated: ["لم يُقيَّم بعد", "Not rated yet"],
  progressNote: ["تقدّمك في هذه الأكاديمية مستقل تمامًا عن أكاديميات البشرى الأخرى.", "Your progress here is fully separate from other Albushra academies."],
  // curriculum
  curriculum: ["المنهج الدراسي", "Curriculum"], unit: ["الوحدة", "Unit"], lesson: ["الدرس", "Lesson"], lessons: ["دروس", "lessons"],
  done: ["مكتمل", "Done"], open: ["افتح", "Open"], locked: ["أكمل الدرس السابق أولًا", "Finish the previous lesson first"], markDone: ["اعتبره مكتملًا", "Mark as done"],
  learn: ["تعلّم", "Learn"], practice: ["تدرّب", "Practice"], startPractice: ["ابدأ التدريب", "Start practice"], lessonPassed: ["أحسنت! اكتمل الدرس.", "Well done! Lesson complete."],
  needScore: ["تحتاج {n} أو أكثر لإكمال الدرس. حاول مجددًا.", "You need {n} or more to complete the lesson. Try again."],
  backToPath: ["العودة إلى المنهج", "Back to the curriculum"], nextInPath: ["الدرس التالي", "Next lesson"],
  // vocabulary
  categories: ["فئات المفردات", "Vocabulary categories"], words: ["كلمة", "words"], example: ["مثال", "Example"], meaning: ["المعنى", "Meaning"],
  save: ["احفظ في مفرداتي", "Save to my words"], saved: ["محفوظة", "Saved"], remove: ["أزل", "Remove"], myWords: ["مفرداتي", "My words"],
  review: ["مراجعة", "Review"], browse: ["تصفّح", "Browse"], dueNow: ["للمراجعة الآن", "Due now"], mastered: ["متقنة", "Mastered"],
  tapToFlip: ["اضغط لقلب البطاقة", "Tap to flip"], again: ["مرة أخرى", "Again"], hard: ["صعبة", "Hard"], good: ["جيدة", "Good"], easy: ["سهلة", "Easy"],
  reviewDone: ["أنهيت مراجعة اليوم. أحسنت!", "You're done reviewing for today!"], noWords: ["لم تحفظ كلمات بعد. افتح فئة واحفظ ما تريد مراجعته.", "No saved words yet. Open a category and save words to review."],
  note: ["ملاحظة", "Note"], pos: ["النوع", "Part of speech"], level: ["المستوى", "Level"], studyWord: ["افتح في الاستوديو", "Open in studio"],
  // exercises
  check: ["تحقّق", "Check"], nextQ: ["التالي", "Next"], correct: ["إجابة صحيحة", "Correct"], wrong: ["إجابة خاطئة", "Not quite"], answerWas: ["الإجابة الصحيحة:", "Correct answer:"],
  chooseMeaning: ["اختر المعنى الصحيح", "Choose the meaning"], chooseTerm: ["اختر الكلمة الصحيحة", "Choose the right word"],
  listenChoose: ["استمع واختر ما سمعت", "Listen and choose what you hear"], matchPairs: ["صِل كل كلمة بمعناها", "Match each word to its meaning"],
  orderWords: ["رتّب الكلمات لتكوين الجملة", "Put the words in order"], translateTo: ["ترجم إلى {lang}", "Translate into {lang}"], typeHere: ["اكتب هنا…", "Type here…"],
  dictation: ["استمع واكتب", "Listen and write"], speakIt: ["انطقها", "Say it"], tapSpeak: ["اضغط وتحدّث", "Tap and speak"], heard: ["سمعنا", "We heard"],
  skip: ["تخطَّ", "Skip"], reset: ["ابدأ من جديد", "Start over"], result: ["النتيجة", "Result"], score: ["الدرجة", "Score"], finish: ["إنهاء", "Finish"],
  qOf: ["السؤال {i} من {n}", "Question {i} of {n}"], noSpeechRec: ["التعرّف على الكلام غير متاح هنا. جرّب Chrome على أندرويد واسمح بالميكروفون.", "Speech recognition isn't available here. Try Chrome on Android and allow the microphone."],
  micDenied: ["لم نتمكن من استخدام الميكروفون.", "Couldn't use the microphone."],
  // grammar / dialogues
  grammarIntro: ["قواعد مشروحة بالعربية مع أمثلة وتمارين.", "Grammar explained in Arabic with examples and exercises."], pattern: ["النمط", "Pattern"],
  examples: ["أمثلة", "Examples"], mistakes: ["أخطاء شائعة", "Common mistakes"], exercises: ["تمارين", "Exercises"], why: ["لماذا؟", "Why?"],
  dialoguesIntro: ["محادثات واقعية متدرجة: استمع، كرّر، ثم أجب.", "Graded real-life conversations: listen, repeat, then answer."],
  playAll: ["شغّل المحادثة", "Play conversation"], roleplay: ["أدِّ دور", "Role-play as"], keyPhrases: ["عبارات أساسية", "Key phrases"],
  comprehension: ["أسئلة الفهم", "Comprehension"], showTranslation: ["الترجمة", "Translation"], showReading: ["النطق", "Reading"],
  yourTurn: ["دورك: انطق الجملة", "Your turn: say the line"],
  // studio
  studioIntro: ["اختر حرفًا أو مقطعًا أو كلمة أو جملة لتسمع النطق الصحيح بأصوات مختلفة وسرعتين، وتشاهد مقطع النطق، وتختبر نطقك.", "Pick a character, syllable, word or sentence to hear it in different voices and speeds, watch the pronunciation clip, and test yourself."],
  studioPh: ["اكتب أو الصق نصًا…", "Type or paste text…"], voice: ["الصوت", "Voice"], female: ["أنثى", "Female"], male: ["ذكر", "Male"], voiceN: ["صوت {n}", "Voice {n}"],
  slow: ["بطيء", "Slow"], normal: ["عادي", "Normal"], repeat: ["تكرار", "Repeat"], breakdown: ["تقطيع المقاطع", "Syllable breakdown"],
  compare: ["قارن بنطقك", "Compare with yours"], record: ["سجّل صوتك", "Record yourself"], stopRec: ["أوقف التسجيل", "Stop"], playMine: ["استمع لتسجيلك", "Play my recording"],
  playModel: ["استمع للنطق الصحيح", "Play the model"], clip: ["مقطع النطق", "Pronunciation clip"], playClip: ["شغّل المقطع", "Play clip"],
  aiVideo: ["فيديو النطق بالذكاء الاصطناعي", "AI pronunciation video"], videoReady: ["فيديو معتمد", "Approved video"],
  videoQueued: ["طلب الفيديو في قائمة الانتظار. الصوت متاح الآن.", "Video requested and queued. Audio works now."],
  videoRequest: ["اطلب فيديو لهذا النص", "Request a video for this"], videoSignIn: ["سجّل الدخول لطلب فيديو.", "Sign in to request a video."],
  videoNone: ["لا يوجد فيديو معتمد بعد لهذا النص.", "No approved video for this yet."], videoStatus: ["حالة الفيديو", "Video status"],
  st_queued: ["في قائمة الانتظار", "Queued"], st_generating: ["قيد التوليد", "Generating"], st_review: ["بانتظار المراجعة", "Awaiting review"],
  st_approved: ["معتمد", "Approved"], st_rejected: ["مرفوض", "Rejected"],
  noVoices: ["لا يتوفر صوت {lang} على هذا الجهاز. ثبّت «Google Text-to-Speech» ثم أضف حزمة صوت {lang} من إعداداته.", "No {lang} voice on this device. Install Google Text-to-Speech and add the {lang} voice pack."],
  voicesNote: ["تأتي الأصوات من محرّك النطق في جهازك؛ عددها وجنسها يختلفان حسب الجهاز.", "Voices come from your device's speech engine; their number and gender vary by device."],
  similarity: ["التطابق", "Match"], pronGood: ["نطق ممتاز!", "Excellent!"], pronOk: ["قريب، كرّر مرة أخرى.", "Close — try once more."], pronBad: ["لم يتطابق. استمع ببطء ثم كرّر.", "Didn't match. Listen slowly and repeat."],
  // tutor
  tutorIntro: ["معلّم ذكي يشرح بالعربية، يصحّح جملك، يترجم، ويحاورك في مواقف واقعية.", "An AI tutor that explains in Arabic, corrects your sentences, translates and role-plays real situations."],
  tutorCtx: ["سياق الدرس الحالي", "Current lesson context"], tutorNoCtx: ["لا يوجد درس محدد؛ اسأل أي سؤال.", "No lesson selected; ask anything."], clearCtx: ["امسح السياق", "Clear context"],
  tutorOff: ["المعلّم الذكي يعمل بعد ربط Firebase (خطوات المالك).", "The AI tutor works once Firebase is connected (owner steps)."],
  tutorSignIn: ["سجّل الدخول لاستخدام المعلّم الذكي.", "Sign in to use the AI tutor."], tutorPh: ["اكتب سؤالك أو جملتك…", "Write your question or sentence…"],
  send: ["أرسل", "Send"], thinking: ["يفكّر…", "Thinking…"], tutorErr: ["تعذّر الرد الآن. حاول بعد قليل.", "Couldn't answer now. Try again shortly."], aiLabel: ["المعلّم الذكي", "AI tutor"],
  formal: ["رسمي", "Formal"], informal: ["غير رسمي", "Informal"], scenario: ["محاكاة موقف", "Scenario"],
  tq_explain: ["اشرح لي قاعدة هذا الدرس", "Explain this lesson's grammar"], tq_correct: ["صحّح جملتي", "Correct my sentence"],
  tq_translate: ["ترجم هذه الجملة", "Translate this sentence"], tq_examples: ["أعطني ٥ أمثلة جديدة", "Give me 5 new examples"],
  tq_pron: ["كيف أنطق هذا؟", "How do I pronounce this?"], tq_quiz: ["اختبرني بثلاثة أسئلة", "Quiz me with 3 questions"],
  tq_formal: ["ما الفرق بين الرسمي وغير الرسمي هنا؟", "Formal vs informal here?"],
  sc_restaurant: ["في المطعم", "At a restaurant"], sc_shop: ["في المتجر", "In a shop"], sc_taxi: ["في سيارة الأجرة", "In a taxi"], sc_intro: ["التعارف", "Meeting someone"],
  // tests
  testsIntro: ["اختبارات مستوى متدرجة. عند النجاح بنسبة {n} تحصل على شهادة إتمام من البشرى.", "Graded level tests. Pass with {n} to get an Albushra completion certificate."],
  questions: ["سؤالًا", "questions"], passMark: ["درجة النجاح", "Pass mark"], best: ["أفضل نتيجة", "Best"], passed: ["ناجح", "Passed"], failed: ["لم تنجح بعد", "Not passed yet"],
  certificate: ["الشهادة", "Certificate"], viewCert: ["اعرض الشهادة", "View certificate"], printCert: ["اطبع أو احفظ PDF", "Print or save as PDF"],
  certTitle: ["شهادة إتمام", "Certificate of Completion"], certBody: ["تشهد {academy} بأن", "{academy} certifies that"], certFor: ["أتمّ بنجاح", "has successfully completed"],
  certScore: ["بنتيجة", "with a score of"], certNote: ["شهادة إتمام تعليمية من البشرى، وليست شهادة رسمية من جهة الاختبار الدولية.", "An Albushra learning completion certificate, not an official certificate of the international exam body."],
  certName: ["الاسم على الشهادة", "Name on the certificate"], serial: ["الرقم التسلسلي", "Serial"],
  // profile
  profile: ["ملفي", "Profile"], signIn: ["تسجيل الدخول", "Sign in"], signOut: ["تسجيل الخروج", "Sign out"], google: ["المتابعة بحساب Google", "Continue with Google"],
  email: ["البريد الإلكتروني", "Email"], password: ["كلمة المرور", "Password"], name: ["الاسم", "Name"], createAccount: ["إنشاء حساب", "Create account"],
  forgot: ["نسيت كلمة المرور؟", "Forgot password?"], resetSent: ["أرسلنا رابط إعادة التعيين إلى بريدك.", "Reset link sent."],
  oneAccount: ["حساب واحد لكل أكاديميات البشرى: سجّل مرة واحدة، وادخل كل أكاديمية بنفس الحساب، ويبقى تقدّم كل لغة مستقلًا.", "One account for all Albushra academies: register once, sign in to each academy with it, and each language keeps its own progress."],
  noFirebase: ["الحسابات غير مفعّلة بعد. تقدّمك محفوظ على هذا الجهاز.", "Accounts aren't enabled yet. Your progress is saved on this device."],
  signedInAs: ["مسجّل باسم", "Signed in as"], goal: ["الهدف اليومي (نقاط)", "Daily goal (XP)"], settings: ["الإعدادات", "Settings"],
  exportData: ["صدّر بياناتي", "Export my data"], resetData: ["امسح تقدّمي في هذه الأكاديمية", "Reset my progress in this academy"], confirmReset: ["هل أنت متأكد؟ سيُحذف تقدّمك في هذه الأكاديمية فقط.", "Are you sure? Only this academy's progress will be deleted."],
  showReadingPref: ["إظهار النطق المكتوب فوق الكلمات", "Show the reading above words"], showArPref: ["إظهار الترجمة العربية", "Show Arabic translation"],
  // admin
  adminIntro: ["إدارة محتوى هذه الأكاديمية ومراجعة الوسائط. صلاحيات كل أكاديمية مستقلة.", "Manage this academy's content and review media. Each academy has its own permissions."],
  claimAdmin: ["تفعيل حسابي كمدير أول", "Make me the first admin"], notAdmin: ["هذه الصفحة للمحررين فقط.", "Editors only."],
  contentFiles: ["ملفات المحتوى", "Content files"], editJson: ["تعديل", "Edit"], publish: ["انشر التعديل", "Publish override"], revert: ["ارجع للأصل", "Revert to original"],
  published: ["نُشر التعديل.", "Override published."], invalidJson: ["صيغة JSON غير صحيحة", "Invalid JSON"], mediaQueue: ["طابور الفيديو", "Video queue"],
  videoUrl: ["رابط الفيديو (mp4 أو YouTube)", "Video URL (mp4 or YouTube)"], approve: ["اعتماد", "Approve"], reject: ["رفض", "Reject"],
  learners: ["المتعلّمون", "Learners"], team: ["الفريق", "Team"], role: ["الدور", "Role"], uidLabel: ["معرّف المستخدم (UID)", "User ID (UID)"], addMember: ["أضف", "Add"],
  noItems: ["لا يوجد شيء هنا بعد.", "Nothing here yet."], saved2: ["حُفظ", "Saved"], requests: ["طلبات", "requests"],
};

let current = "ar";
try { const p = JSON.parse(localStorage.getItem("ac.prefs") || "{}"); if (p.lang === "en") current = "en"; } catch (e) {}
let DICT = BASE;
let NAME = { ar: "", en: "" };

export function extend(extra = {}, shortName) { DICT = { ...BASE, ...extra }; if (shortName) NAME = shortName; }
export const lang = () => current;
export function setLang(l) {
  current = l === "en" ? "en" : "ar";
  document.documentElement.lang = current;
  document.documentElement.dir = current === "ar" ? "rtl" : "ltr";
}
export function t(k, vars) {
  const v = DICT[k];
  let s = v ? v[current === "ar" ? 0 : 1] ?? v[0] : k;
  s = s.replace("{academy}", NAME[current] || "");
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll(`{${a}}`, b);
  return s;
}
// Bilingual content object {ar, en} → current language (falls back to the other).
export const L = (o) => (o == null ? "" : typeof o === "string" ? o : o[current] ?? o.ar ?? o.en ?? "");
