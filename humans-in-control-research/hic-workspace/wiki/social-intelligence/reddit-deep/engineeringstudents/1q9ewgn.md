---
id: social-intelligence/reddit-deep/engineeringstudents/1q9ewgn.md
url: "https://www.reddit.com/r/EngineeringStudents/comments/1q9ewgn/do_engineers_actually_know_how_to_code/"
kind: "social-post"
source: "reddit-deep: r/engineeringstudents"
subreddit: "engineeringstudents"
title: "Do engineers actually know how to code?"
author: "RiverHe1ghts"
date: "2026-01-10T20:37:09.000Z"
score: 105
upvote_ratio: 0.84
num_comments: 106
flair: "Discussion"
extracted_at: "2026-05-22T21:34:47.625Z"
extraction_method: "praw-deep"
research_goal: "Develop a comprehensive new co-op strategy for NU, informed by its current SOW, prior projects, and a fresh industry analysis of experiential learning and engagement tactics, to maximize learner access to meaningful experiential opportunities from pre-enrollment through graduate school."
industries: [higher_ed, workforce]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/engineeringstudents/1q9ewgn.md#c0"
    char_span: [0, 1008]
    sentence_count: 9
    key_terms: [engineeringstudents, year, engineers, comments, chatgpt, started, coding, bit]
    concepts: [engineeringstudents, engineers, comments, chatgpt, started]
    token_count: 240
    sources: [{"n":"reddit-deep: r/engineeringstudents","u":"https://www.reddit.com/r/EngineeringStudents/comments/1q9ewgn/do_engineers_actually_know_how_to_code/"}]
  - id: "social-intelligence/reddit-deep/engineeringstudents/1q9ewgn.md#c1"
    char_span: [1022, 2754]
    sentence_count: 13
    key_terms: [coding, matlab, being, engineering, data, use, programmer, necessary]
    concepts: [coding, matlab, engineering, being, programmer]
    section: Comments
    token_count: 426
  - id: "social-intelligence/reddit-deep/engineeringstudents/1q9ewgn.md#c2"
    char_span: [2756, 4564]
    sentence_count: 10
    key_terms: [led, thepowerfulpaet, arduino, digitalwrite, code, problem, voltage, "that's"]
    concepts: [thepowerfulpaet, arduino, digitalwrite, problem, voltage]
    section: Comments
    token_count: 454
  - id: "social-intelligence/reddit-deep/engineeringstudents/1q9ewgn.md#c3"
    char_span: [4566, 6633]
    sentence_count: 10
    key_terms: [people, anexcitedpanda, weakechoregion, codes, professors, chatgpt, instead, syntax]
    concepts: [people, anexcitedpanda, weakechoregion, codes, professors]
    section: Comments
    token_count: 507
  - id: "social-intelligence/reddit-deep/engineeringstudents/1q9ewgn.md#c4"
    char_span: [6635, 8562]
    sentence_count: 15
    key_terms: [code, using, different, something, programming, day, like, line]
    concepts: [different, something, using, programming, language]
    section: Comments
    token_count: 435
  - id: "social-intelligence/reddit-deep/engineeringstudents/1q9ewgn.md#c5"
    char_span: [8564, 9900]
    sentence_count: 11
    key_terms: [write, specifically, code, use, matlab, school, "you're", "don't"]
    concepts: [write, specifically, matlab, school, "you're"]
    section: Comments
    token_count: 313
---
# Do engineers actually know how to code?

Source: [reddit-deep: r/engineeringstudents](https://www.reddit.com/r/EngineeringStudents/comments/1q9ewgn/do_engineers_actually_know_how_to_code/)
Posted by **RiverHe1ghts** · **105↑** · **106 comments**

I'm a first year Mechatronics engineering student. We have started any coding classes yet, but we did a bit on a fun intro into what we'd be doing in our second year with arduinos and raspberry pi's. My lecturer got some final year Mechanical students to show us, take us through a bit of a hands on experiment.

The task was simple. To make a blinking LED light that was connected to an Arduino. As they were teaching us, they started having issues with theirs and they basically just gave it to ChatGPT to solve. Throughout the class, they just heavily relied on ChatGPT to do the coding.

Now, I don't know if it was specific to them, but it got me wondering, do engineers actually know how to code at a decent level, or we just have an idea on what to do.

## Comments

- **Several-Instance-444** (212↑): I'm still taking senior level classes, and I can understand matlab, C++ and python. That being said, i'm not at a CS level of understanding, more just that I can do simple tasks with these languages.
  - **RiverHe1ghts** (25↑): So what type of industries are we, or you specifically aimed at entering, and is much coding even necessary for it?
    - **Makisisi** (75↑): Coding in engineering is all about being able to analyse data
    - **Skysr70** (56↑): I'll give you a hint: nobody does math by hand ever in business.
    - **Ragnarok314159** (4↑): I do very little coding and much more analysis and excel stuff. 

My career also switched trajectory to managing others and projects rather than pure engineering, so it’s more being a sanity check for others.
    - **ball_zout** (2↑): I’m an environmental engineer. I mostly do air quality work for a utility. Any time you use a computer emissions monitoring system there is a huge amount of data to sort through. I have found the ability to use R and Matlab to be incredibly helpful. We aren’t in CS. Any programmer looking at my scripts would puke. But my boss isn’t a programmer. She’s a boomer who is very impressed with my ability to deal with data way faster than anyone else in my department. For me programming wasn’t a necessary skill to get a job but it is a valuable skill that set me apart from my peers.
    - **180Proof** (1↑): Math. 


If you work in manufacturing, PLCs & DAQs.
- **inorite234** (76↑): There are MEs in the field that do know how to code and use Matlab extensively.  And there are MEs like me who never have to code other than switching the COM ports on a Window machine (hint, it takes zero coding to do that). 

The real answer is that it all depends.  But if you don't want to code as a working professional, you don't have to.
- **ThePowerfulPaet** (89↑): Frankly that's embarrassing. A blinking LED is literally the first tutorial of any arduino.
  - **RiverHe1ghts** (24↑): I felt a bit of second hand embarrassment myself honestly, but I just guessed it slipped their mind or something.
    - **ThePowerfulPaet** (31↑): In fact, here's the whole code. It is literally built into the Arduino IDE. It's the Hello World of microcontrollers. This is for the onboard LED, but for a separate one you just have to complete a circuit and change the "LED\_BUILTIN" to the number of the slot that you plugged your LED into. Couldn't be simpler if you tried.

It's really easy to forget small things in C++, but it shouldn't be easy enough to stump seniors that supposedly know what they're doing with the easiest project possible.

    void setup() {
      pinMode(LED_BUILTIN, OUTPUT);
    }
    
    void loop() {
      digitalWrite(LED_BUILTIN, HIGH);  // turn the LED on (HIGH is the voltage level)
      delay(1000);                      // wait for a second
      digitalWrite(LED_BUILTIN, LOW);   // turn the LED off by making the voltage LOW
      delay(1000);                      // wait for a second
    }
  - **BuboNovazealandiae** (3↑): Yeah, and there's an example blink sketch on every install of the base Arduino IDE, and most others besides
  - **Occhrome** (2↑): Not just that. But being able to trouble shoot the code to figure out what went wrong.
- **AnExcitedPanda** (41↑): "As they were teaching us, they started having issues with theirs and they basically just gave it to ChatGPT to solve. " That's a generational problem, not an an engineering problem (I'm sorry if i'm preaching to the choir btw). 

I mean it, think about how quick they went to an easy solution instead of asking the professors that yall PAY FOR to help? You are right to question if they can code, they literally can't. Now should they? I had to get decent at some MATLAB and Python in some courses but I think it is application specific.
  - **Fair-Stop9968** (2↑): Bold of you to assume that professors aren’t often condescending assholes
    - **AnExcitedPanda** (1↑): I never assumed that, if they are please report them to the dean of your program. These people have no business being a professor.
  - **accountforfurrystuf** (-4↑): I think it shows why there’s no entry level jobs anymore
- **WeakEchoRegion** (51↑): This is the circuits equivalent of walking into linear algebra and your prof needs to use wolfram alpha to find the determinant of a 2x2 matrix lmao
  - **coldchile** (18↑): To be fair if you don’t know the syntax it’s not like it’s just gonna come to you. 

I’ve coded with arduinos multiple times over the years but not consistent enough to remember the syntax off the bat.
    - **WeakEchoRegion** (3↑): I know man I was just taking the low hanging fruit
  - **AnExcitedPanda** (2↑): this made me chuckle XD
- **rkelly155** (14↑): I think there will a be a sharp divide between the "before" times and after in terms of what people try first....   I have noticed in my direct reports already, their first instinct is to ask ChatGPT how to do a thing, instead of ya know.... thinking about it.    It's not yet clear which is better, ChatGPT can be a great tool but it's a little scary to see people completely opt out of engaging with a problem they're faced with.
  - **Lmao1903** (2↑): The language models just make things insanely easy for people to try that out first. I mean you can write codes that would take you an insane amount of time in like hours with GPT or especially Claude. I think it will inevitably be integrated to writing codes anyway, where you will have to understand the codes, but it will be straight up wasting time to not get help from these tools.

The dangerous part is gonna be when the guy using the codes from GPT can't understand it exactly, like line by line what the hell is going on, why this is used here, etc. Because then what if its doing something you don't want but you can't tell from the results. But I think it will, without question, end up being part of the coding process for everyone, will be dumb not to have it in the process. A lot of professors these days are actually allowing the use of AI but asking for stuff like idk explain it clearly or explain what you got from AI or something. But on the flipside there will be a lot kids opening up a task and just copy pasting the codes and calling it a day
- **Desert_Fairy** (6↑): I’m an engineer in the field (degree was in EE) and I have to re-learn every programming language as I use it. 

I can be using VBA daily and then have a year where I’m not using it much and by the time I do another project that needs VBA, I remember that I can do something… I just don’t remember how I did it. 

This is why commenting your code is very important.  Especially if you are going to be working with hardware.  Every piece of equipment has different commands, different communication types, and different firewall requirements. 

While PYTHON is very versatile, you may end up doing ladder programming with PLCs or manufacturing using LabVIEW/TestStand. 

People who work in one language all day every day may be able to do so from memory, but those are the jobs that will be most easily replaced by AI. 

So when learning code, learn code theory.  All code follows the same logic and theory.  The only difference is vernacular and application.
- **Orangenbluefish** (11↑): Honestly grabbing mechE people and having them code was a bold choice. Been through mechE and now been working in the field for a few years and have yet to ever write a single line of code aside from a bit of matlab in like 1 lab class

If you’re specifically in a computer related engineering field then absolutely they’ll need coding, but as far as I’m aware none of the “standard” engineer paths use it much unless you specifically go looking for it
  - **Lysol3435** (2↑): I think it depends on school. My undergrad had a full year of mechatronics, semester of controls, and almost all of the other courses required writing MATLAB to solve the problems. In grad school, every course had a programming element. Now I write code every day tools
- **AgentLinch** (3↑): The reality is for a lot of stem degrees people just forget everything the moment they’re done with the classes
  - **EscapeWitty8244** (2↑): I feel targeted :(
- **Axiproto** (3↑): Do runners know how to tie shoes? The answer is yes. It's practically your bread and butter. Even if you don't write embedded software such as C or C++, chances are, you're going to see Matlab, python, or some other modeling/scripting language.

Also, since you brought up ChatGPT, there is heavy emphasis on when and how you use AI to write code for you. It's a useful too, 100%, but don't get comfortable with the idea that it'll write your entire code-base for you. Treat it more like a guide rather than a servant. Regardless of whether you use AI or not, you're responsible for understanding what your own code does.
