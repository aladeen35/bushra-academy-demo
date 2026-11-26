# Arabic translation guide — Albushra Literature

Audience: Arabic-speaking learners of English (Sudan and the Gulf), B1–B2. The Arabic sits beside the English,
paragraph by paragraph, so learners can compare them.

## Rules
1. **Complete and faithful.** Translate every paragraph fully. Never summarize, merge, split, skip, soften or add.
   Keep the meaning, tone, dialogue, irony and the paragraph boundaries.
2. **Language.** Clear, elegant Modern Standard Arabic that a B1–B2 reader can follow. Prefer natural Arabic word
   order over calque. Dialogue in quotation marks «…» or "…" consistently within a chapter; keep speaker tags.
   Rough or dialect speech (sailors, servants, children) stays MSA but in a plainer, rougher register.
3. **Verse and line breaks.** A "\n" inside an English paragraph is a verse line break: keep one Arabic line per English line.
4. **Italics** marked `_like this_` in English: translate the word normally (no underscores in Arabic).
5. **Names.** Use the glossary below. For any new name, transliterate it the way an Arabic edition would, and use it consistently.
6. **Faithfulness to content.** Translate drinking, oaths, violence and religious references as the author wrote them,
   discreetly where the original is discreet. Do not add commentary or footnotes.
7. **Numbers** inside the Arabic text: Arabic-Indic digits (١٢٣) are fine; dates like 17— become ١٧—.
8. **Before you start a book, read its `ar/01.json`** to match the established style and name spellings.

## Workflow (one chapter at a time)
1. Read `content/books/<slug>/chapters/NN.json` (sections → paragraphs with ids p1, p2, …).
2. For each section `sK`, write `content/books/<slug>/ar/_work/NN-sK.json` = `{"p1": "…", "p2": "…"}` with every
   paragraph id of that section. One file per section keeps every write small.
3. Run `node tools/ar-merge.mjs <slug> <n>` from `literature/`. It validates that every paragraph id has a translation
   and writes `ar/NN.json` with status `draft`. Fix and re-run if it reports missing ids.
4. Delete nothing in `_work/` (the owner may want to re-merge).

## Glossaries

**Jane Eyre** — جين إير · مسز ريد · جون ريد · إليزا · جورجيانا · بيسي · الآنسة أبوت · السيد لويد · غيتسهيد · مدرسة لووود ·
السيد بروكلهرست · الآنسة تمبل · هيلين بيرنز · الآنسة سكاتشرد · ثورنفيلد · مسز فيرفاكس · أديل فارين · صوفي · السيد روتشستر (إدوارد) ·
غريس بول · بايلوت (الكلب) · بلانش إنغرام · الليدي إنغرام · السيد ميسون (ريتشارد) · بيرثا ميسون · السيد بريغز · السيد وود (القسيس) ·
مستنقعات المرتفعات / الأحراش (the moor) · مور هاوس / مارش إند · سانت جون ريفرز · ديانا ريفرز · ماري ريفرز · هانا · روزاموند أوليفر · السيد أوليفر ·
مورتون · فيرندين · جون وماري (الخادمان) · ماديرا · العم جون إير.

**Treasure Island** — جيم هوكنز · القبطان (بيلي بونز) · الدكتور ليفسي · السكواير تريلوني · نُزل الأدميرال بنبو · بلاك دوغ (الكلب الأسود) ·
بيو الأعمى · جون سيلفر الطويل · مطعم «المنظار» (the Spy-glass) · القبطان سموليت · السيد آرو · السفينة هسبانيولا · إسرائيل هاندز ·
بن غن · جوب أندرسون · جورج ميري · توم مورغان · أوبراين · ريدروث · هنتر · جويس · أبراهام غراي · فلينت (القبطان) · الببغاء «كابتن فلينت» ·
جزيرة الهيكل العظمي · جبل المنظار · الحصن (the stockade) · القارب الصغير (the jolly-boat) · القرطاس الأسود (the black spot).

**The Prisoner of Zenda** — رودولف راسندل · روز · اللورد بيرلسدون · الملك رودولف الخامس · آل إلفبرغ · روريتانيا · زندا · شتريلساو ·
الدوق ميخائيل («ميخائيل الأسود») · العقيد سابت · فريتز فون تارلنهايم · الأميرة فلافيا · أنطوانيت دي موبان · روبرت هنتزاو ·
ديتشارد · بيرسونين · دي غوتيه · لاوينغرام · كرافشتاين · يوهان · يوزف · الخندق · القلعة القديمة · الجسر المتحرك.

**The Happy Prince and Other Tales** — الأمير السعيد · السنونو · القصبة · العندليب والوردة · العملاق الأناني · الصديق الوفي ·
هانز الصغير · ميلر الطحّان · فأر الماء · البطة · العصفور الكتّان (Linnet) · الصاروخ العجيب.

**Alice's Adventures in Wonderland** — أليس · الأرنب الأبيض · الدودة القزّة/اليسروع (the Caterpillar) · الدوقة · قطة شيشاير ·
صانع القبعات · الأرنب البري (the March Hare) · الزغبة (the Dormouse) · ملكة القلوب · ملك القلوب · جاك القلوب · الغريفون ·
السلحفاة المزيفة (the Mock Turtle) · بيل السحلية · دينا (قطة أليس).

**Dr Jekyll and Mr Hyde** — السيد أترسون (المحامي) · ريتشارد إنفيلد · الدكتور هنري جيكل · إدوارد هايد · الدكتور هاستي لانيون ·
بول (الخادم) · السير دانفرز كارو · غيست (الكاتب) · المفتش نيوكومن · ساحة سوهو.

**The Call of the Wild** — باك · القاضي ميلر · وادي سانتا كلارا · مانويل · فرانسوا · بيرو · سبيتز · ديف · سول-ليكس · كيرلي ·
جو · بيلي · بايك · داب · دولي · هال · تشارلز · ميرسيدس · جون ثورنتون · سكيت · نيغ · بيت وهانز · قبيلة اليِيهات · كلوندايك · يوكون · داوسون.

**Gulliver's Travels** — لِمويل غليفر · ليليبوت · بليفوسكو · الإمبراطور · ميلدندو (العاصمة) · فلِمْناب (أمين الخزانة) · سكايرش بولغولام (الأمير الأميرال) · ريلدريسال ·
حزب الكعوب العالية (Tramecksan) وحزب الكعوب المنخفضة (Slamecksan) · أنصار الطرف الكبير وأنصار الطرف الصغير (Big-Endians / Little-Endians) · كوينبس فلسترين («رجل الجبل») ·
بروبدينغناغ · غلومدالكليتش · لابوتا · بالنيباربي · لاغادو · غلبدبدريب · لاغناغ · الستراديلبراغ · اليابان · الهويهنم · الياهو · السفينة «الظبية» (the Antelope) · بريستول.
