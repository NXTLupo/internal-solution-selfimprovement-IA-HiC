#!/bin/sh
# The four field-test cases through the page, one after another, on the current build. Each writes its own log.
cd "C:/Users/JonathanLupo/AppData/Local/Temp/claude/b9ee033047dc9221/c468b219-c717-4229-83ff-783ba86fa37a/scratchpad/pw"
echo "start $(date +%H:%M:%S)" > all.log
node d.mjs "await page.goto('http://127.0.0.1:9460/',{waitUntil:'load'}); await sleep(2500); await page.click('#newConv'); await sleep(800);" >> all.log 2>&1
MSG="What are the top AI news stories today?" SHOT="f1" MAXS=120 node d.mjs "@say.js" > f1.log 2>&1
echo "case1 done $(date +%H:%M:%S)" >> all.log
MSG="#themes Give me an exhaustive set of themes on what is happening in AI right now" ENGNAME="AI themes right now (final build)" PACKS="AI Trends" SHOT="f2" MAXS=1500 node d.mjs "@ui_case.js" > f2.log 2>&1
echo "case2 done $(date +%H:%M:%S)" >> all.log
MSG="#themes Find exhaustive themes in how higher education students use AI and how they feel about it" ENGNAME="Higher ed students and AI (final build)" PACKS="Higher Ed,AI Trends" SHOT="f3a" MAXS=1500 node d.mjs "@ui_case.js" > f3a.log 2>&1
echo "case3 themes done $(date +%H:%M:%S)" >> all.log
MSG="Now make an audio overview, a research report, a themes PowerPoint deck and a student journey map from these findings" ENGTITLE="Higher ed students and AI (final build)" ENG="x" SHOT="f3b" MAXS=2700 node d.mjs "@ui_case.js" > f3b.log 2>&1
echo "case3 four done $(date +%H:%M:%S)" >> all.log
MSG="Research what has changed this month in nurse staffing levels and patient outcomes, write a short report, then build a prototype of a staffing dashboard for a chief nursing officer" ENGTITLE="Nurse staffing levels and patient" ENG="x" PACKS="Healthcare" SHOT="f4" MAXS=2400 node d.mjs "@ui_case.js" > f4.log 2>&1
echo "case4 done $(date +%H:%M:%S)" >> all.log
