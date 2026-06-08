---
url: "https://www.reddit.com/r/cscareerquestions/comments/1ph4ux0/array_reversal_as_a_filtering_question/"
kind: "social-post"
source: "reddit-deep: r/cscareerquestions"
subreddit: "cscareerquestions"
title: "Array Reversal as a Filtering Question"
author: "Inner_Butterfly1991"
date: "2025-12-08T05:57:52.000Z"
score: 203
upvote_ratio: 0.92
num_comments: 180
flair: "Lead/Manager"
extracted_at: "2026-06-06T23:23:15.632Z"
extraction_method: "praw-deep"
research_goal: "Identify strategic opportunities for Higher Ed Universities to enhance experiential learning, intern, and co-op success, based on collected and cached research data. "
---

# Array Reversal as a Filtering Question

Source: [reddit-deep: r/cscareerquestions](https://www.reddit.com/r/cscareerquestions/comments/1ph4ux0/array_reversal_as_a_filtering_question/)
Posted by **Inner_Butterfly1991** · **203↑** · **180 comments**

I'm a Tech Lead at a company you've heard of and I have 11 yoe. I'm typically anti-LC in interviews, my style is typically I pick the project they've listed on their resume that seems the most interesting both in terms of level of difficulty and just of interest to me, and drill super deep on it to really tease out if they did what they said they did. And 9/10 times that works. But until you've interviewed lots of people, you don't realize how good some people are at bullshitting. This is why LC exists, and it's why we implemented at least a super basic tech screen. We're a data team so we give them a sample dataset from data we actually work with, and ask them to do some super basic transformations and aggregations. We'll also work with them and are very forgiving, we're not looking for you to get the answer even, but we're looking for the signs that you actually understand the super basics and when given feedback can adjust your approach and at least have the right mindset.

So back to the title, it astounded me when there was a post in this sub where someone was super upset that reversing an array without using the reverse function would be a question, as that was too much of memorizing algorithms. If we were talking an LC hard then sure I agree. But to anyone who knows the basics about programming this should be super easy. But given all the pushback I reconsidered, and I tested myself to ensure I could do it. And within 5 minutes I had 3 different solutions. Again I don't do LCs regularly, I've done some in job prep but we're talking about \~10 hours in my life and I'm on my 4th job. I don't think I've ever successfully done a hard, and although I can easily do most easy ones and am around 50/50 at mediums, there was one easy I failed on. I'm definitely not the LC, memorize algorithms type. But again this isn't an algorithm question it's one of the most basic things you can do. I used python but the fundamentals are the same in all languages:

1.


    for i in range(len(array)):
        array2[len(array) - 1 - i] = array[i]
    array = array2




2.


    j = 0
    for i in range(len(array)-1,-1,-1):
      array2[j] = array[i]
      j += 1
    array = array2

And probably the most algorithm answer:

    i = 0
    j = len(array) - 1
    while j > i:
        a = array[i]
        array[i] = array[j]
        array[j] = a
        i += 1
        j -= 1

And I'd assume in an interview setting it's fine to be running code and refining it, I certainly did when doing especially the last one (I had the while condition j > 0 initially so it was actually re-reversing so ending with the original array). And I get it I have 11 yoe this was talking about a junior level interview. But if there's even an intern on the team, I'm expecting them to be able to figure things out much more complicated than reversing an array, and I don't think that's all that crazy to expect them to be able to do. My analogy I used was saying "you'll never have to reverse an array at your job" is similar to if a French to English translator was asked to count to 10 in French, couldn't, and angrily replied "when am I ever going to be counting to 10 in my job?" And the answer is you'll be asked to do things so much more difficult, and if you can't count to 10 in the language you're translating from obviously you're not going to be able to perform the job duties.

As I mentioned, I've never asked this question in an interview, but I'm asking much harder questions. I'm asking our junior level folks to calculate weighted averages excluding outliers and creating summary statistics by year. I'm then changing the requirements and seeing how they can update their code with the shifting requirements. And I don't think those are even all that hard, they're the bare minimum I'd expect interns to be able to do. We care a lot more about soft skills and perceived willingness to learn, but we need you to be able to do the bare minimum from a technical perspective. Do people really think asking a potential employee whether they can reverse an array is that crazy and means we expect them to memorize algorithms that have nothing to do with the job? This isn't an LC hard, I don't think any of my solutions above are all that crazy or tough to come up with if you understand the basics of arrays and loops. And given how business logic works, it's not even that crazy to be a real world example. What if there are certain values in the array that can't be moved due to government regulation or enterprise requirements so you can only reverse all the other elements while keeping certain values in their place? You can't use a reverse function for that. And that's a hell of a lot tougher of a problem than simple reversal.

I don't know I guess it just astounds me that this sub is all about how tough this market is especially for juniors, yet at the same time it's crazy to expect a junior can do something that in my mind is super basic and contrary to the arguments against it does not actually require memorizing any algorithms, just using a little bit of critical thinking about what reversing an array actually is doing (first is last, second is second to last, etc).

## Comments

- **OkCluejay172** (179↑): >I don't know I guess it just astounds me that this sub is all about how tough this market is especially for juniors, yet at the same time it's crazy to expect a junior can do something that in my mind is super basic and ... just using a little bit of critical thinking

These two things point in the same direction.

A person who thinks it's unreasonable to be expected to be able to do a basic question that isn't spoonfed to them is also going to think the job market is too harsh to break into.
  - **CardiologistOk2760** (46↑): The market is difficult because of the ratio of noise to signal.

What drained me in my job search over the summer was that coding exercises were rare, so it was hard to stand out and get hired despite being decent at interviewing. I interviewed for 2 dozen positions and maybe 10 of them administered coding exercises. Two of the 10 sent me offers. None of the others did. So for me the presence of a coding exercise is the difference between a 20% chance of getting hired and 0%. And I don't grind leetcode - I dabble.

That's not even getting into the signal vs noise for getting an interview to begin with.
    - **HiroProtagonist66** (6↑): I had the exact opposite experience. I  had a 3 month active job search for a senior/staff level position. I had 15 companies that I interviewed with.

I got offers from the 2 that did NOT do coding rounds. I will absolutely own that I don’t do coding interviews well. It’s the time pressure, plus the sheer time it takes to get a working app framework typed in,  plus the whole blank page that is anxiety-inducing, plus at my level of experience it’s been decades since I’ve done actual DSA stuff. 

My resume got me those interviews. I can and have built systems for a long time. I just struggle to do it in 45 minutes.
    - **Eric848448** (1↑): What did the other places have you do, if not coding problems?
  - **oupablo** (-25↑): Conversely, a person with tons of experience is going to think a lot of tasks are easy now that they wouldn't have considered easy when they started. When talking entry/junior level positions, the expectation is that they have ZERO or ALMOST NO experience. Does reversing an array sound easy to someone who's worked with arrays in multiple languages over 15 years, of course. Does it sound so easy when your only experience with arrays is dealing with an array of 10 items a few times in coding assignments in school? I don't know.

The problems with interviews is that people are looking to test someone's existing knowledge in most cases. You shouldn't care about that at all for a junior. What you SHOULD care about is how quickly they pick things and how good they are at solving a problem. Who cares if they don't know how to reverse an array if they can figure it out in a 3 seconds with a quick search? Unless you plan for them to spend all their time optimizing array reversal, you probably want someone that can find their way around a code base and is capable of debugging more than someone that can spit out from memory (or lack thereof) something that can be easily looked up.
    - **noobcodes** (30↑): I think if you made it through a CS bachelors and you can’t figure out how to reverse an array on the spot, either your school failed you or you AI’d your way through the entire curriculum. 

That’s probably the easiest algorithm you could be asked to implement. If you can’t figure that out, I really doubt you’ll be a net positive to the team in any capacity.
    - **dvmitto** (19↑): This is just wrong. I’m sorry for those self taught but every CS major out there would have algorithms as a required class in their curriculum.
    - **siziyman** (9↑): > your only experience with arrays is dealing with an array of 10 items a few times 

That is below even high school level of CS/algo knowledge, not even speaking about college.
    - **TheRealKidkudi** (8↑): It’s true that someone with experience may bias towards thinking a question is easier than it is. I’ve also seen firsthand interviewers forgetting that their coding challenge is extremely easy to them because they already know the answer and have solved it in dozens of interviews already. 

It’s also true that you should be able to reverse an array if you want to get hired as a programmer. Zero experience does not mean you’ve never written code, it just means nobody has paid you for it. If you expect someone to pay you for it, basic competence in programming is a prerequisite.
    - **emperornext** (8↑): ask your school for a refund
    - **hairygentleman** (5↑): nobody who knows what a for loop is and arrays are but can't figure out how to reverse an array is going to be able to do anything at all in any code base and probably wouldn't even be capable of debugging a missing semicolon when their ide is explicitly highlighting it and yelling 'HELLO SIR I BELIEVE THERE IS A MISSING SEMICOLON HERE, WOULD YOU LIKE ME TO FIX IT FOR YOU'. reversing an array isn't a fucking memory or knowledge or experience exam, it's literally just 'do you know what a for loop is, know what an array is, and posses a brain capable of the most minimal levels of independent thought'.
    - **Dzone64** (1↑): I agree with the general premise, but the example might be a bit extreme man. Unless your completely new to the language in the interview ig. The person should at least be able to explain the algorithm though.
- **Independent-Ad-4791** (121↑): If you can’t reverse an array, you don’t know what you’re doing. This is like a phone screen question similar to Fibonacci. I think you’re reading into this sub too much. This sub has dropped in quality a lot over the years.
  - **Gold-Flatworm-4313** (24↑): I'd be surprised if half my graduating class could write a for loop... and this was before ChatGPT made it even easier to get through CS without actually knowing coding
    - **DigmonsDrill** (14↑): US San Diego gave a screening test to a group of 138 incoming students. 

    7 + 2 = [_] + 6

25% could not answer this.

I treat any college degree granted since roughly 2021 as a mere suggestion of competence.
    - **oupablo** (5↑): I think in the modern age, knowledge of the existence of something is way more valuable than knowledge of how to do it. For example, I have never used rust. I couldn't drop into the language and write a for loop. I do, however, know what a for loop is and how I can apply it. So with a tiny amount of effort, I could easily go write a for loop in rust given access to google or chatgpt. Now if they don't know what a for or while loop is, that is a way bigger problem.

College teaches lots of concepts but tends to be pretty lacking on how all those concepts get applied. That's where things like internships become incredibly valuable. I think there is also a very large trend in businesses expecting new graduates to function more like senior engineers with full autonomy than like an actual new grad who's never done this job before.
  - **FalseRegister** (9↑): Agreed. 

For anyone wondering, I've had candidates right out of uni not being able to implement a Fibonacci.
    - **Independent-Ad-4791** (7↑): Yea the first time I interviewed someone they were unable to write Fibonacci. I thought I was being trolled but it really is like that out here.
    - **hume3** (3↑): In all honesty, it is not that straightforward to implement the solution with the best time complexity, O(logn)
- **computer_porblem** (184↑): Any developer born after 2003 Can't Code, All They Know Is Chatgpt, Charge They Phone, Twerk, Eat Hot Chip & Lie On Interview Questions

(tbh this is a pretty reasonable ask)
  - **donniedarko5555** (53↑): There's always been people in this field with no ability to write code. Even the Fizz Buzz test famously caught some developers who on paper seemed competent.

But yes there's plenty of low skill developers out there (even ones coming out of excellent schools) but no this isn't a new problem.

So lets skip out on the ageism and generational stereotyping on what is a careers oriented subreddit.
    - **Gold-Flatworm-4313** (12↑): If reverse array replaced Fizz Buzz I'm going to go insane. Though technically Fizz Buzz can be a pain if you aren't aware of the modulo operator (that I've only used once in my professional career) but it's still actually doable if you create your own function that basically mimics modulo.
    - **tuckfrump69** (4↑): fizzbuzz as filter was dumb because it almost entirely relied on you remembering the modulus operator exist

reverse string/array is actually way more reaosnable.
    - **oupablo** (2↑): *<old man yells at cloud>*

Coincidentally the same thing I think every time I'm fighting terraform now.
    - **computer_porblem** (1↑): i'm being facetious to point out that making assumptions about people based on their birth year is silly. it's a meme format ("any female born after 1993 can't cook").

for what it's worth, i'm pushing 40 and have always been a terrible programmer.
  - **Eat_Pudding** (9↑): Pretty bold of you to assume people born before 2003 can code. My coworker is 96 born and that person couldn't have survived if chatgpt didn't existed.
  - **LonelyProgrammerGuy** (1↑): Awesome. I was born in December in the 2002s. That makes me someone that knows how to code then
    - **computer_porblem** (1↑): that makes one of us
- **MaxGhost** (27↑): lol we give this as our first interview question most of the time (mainly for new-grads), it's shocking how many people it filters out right away.

    // Given this piece of code, fill in the for-loop
    // to print out the numbers 1 to 100 in reverse order

    for (let i = 0; i < 100; i++) {

    }

We'll mention as well "you can use `console.log()` to print out". We tell them to not touch the loop itself, just fill in the body. After a bit of time we'll remind "you only need a one-liner here, don't overthink it".

We don't spend more than like 3 minutes on this. We'll move on even if they don't figure it out if they at least show they have any sentient thought. It's mostly just to break the ice and hopefully get some of their nerves out of the way. But my goodness, like half or more just fall flat on this, it's sad.
  - **pseudo_shell** (28↑): I would weep for such an easy godsend of a question. It’d help me get more comfortable.
    - **xtsilverfish** (-6↑): Sure it would little buddy, say, would saddling a horse at the beginning of the interview help you to? Just trying to make you comfortable. How about grinding some beans and making some coffee at the beginning of the interview. Loosen you up little buddy?
  - **backfire10z** (6↑): Just please let me define a constant and use it for the loop and my console.log :(
    - **MaxGhost** (10↑): You don't need a constant. That's the thing. If you think you need a constant you've already failed at the premise lmao. The answer is literally 7 characters (including sensible whitespace, excluding the `console.log()` part itself)
  - **YetMoreSpaceDust** (4↑): > don't overthink it

Haha, yeah, these stress me out because I see them and I think "this is too easy, I must be under thinking it..."
    - **Eric848448** (1↑): Ugh, I do that every time.
  - **Lucky_Clock4188** (2↑): what kinda company are you
    - **MaxGhost** (3↑): A legacy full stack PHP+TS shop, we're pretty small (~20 people) but we semi-regularly hire coop students or new grads in hope we find some talent that wants to stick around for years to come.
  - **Strange-Resource875** (2↑): honestly im like top 5% contest rating on LC and I was stumped for a bit lol, felt like a brain teaser
  - **[deleted]** (1↑): Honestly if i'm a junior, already nervous without much experience I would probably struggle to see the easy solution because its too easy.   
If that makes sense. My immediate reaction was thinking like do I need modulo lol
    - **MaxGhost** (1↑): Yeah we take into account nervousness, even overthinking is fine to show "yep they have sentient thought" lmao
- **i__hate__you__people** (22↑): I’m not a great programmer. Never was. But a question THAT simple? If people need libraries to do everything then they don’t actually know anything. Hard stop.

I’d ask the preferred programming language, the data type, the storage limitations, and the speed requirements. Hell, I only took 1 semester of C++ a long time ago, and I haven’t used it since, but I could still do this using pointers, let alone with a simple modern programming language using an array or hash.

If someone can’t answer a question this basic, they have no business applying for a programming job.

My first interview out of college I was asked to write 2 functions on a white board in the language of my choice. (Not on a computer, just with a marker.) Both were computing x^y, but one had to be iterative and one recursive. Yeah, there are functions to do that, but they didn’t want to know if I knew the function, they wanted to see if I knew how to program.
  - **Unlucky_Buy217** (8↑): I have not used c outside of my CS degree courses but it's damn well the only language that helped really understand the intricacies of programming languages, for example, pointers and memory management take a while to grasp but when you grasp it, there is just so much depth you get, and reasons for so many peculiar decisions. It also allows you to think about how you use the resources at your disposal.
    - **ibeerianhamhock** (8↑): Yeah I mean it’s been forever since I’ve used traditional C but I think learning it or C++ should still be required learning for a comp sci program, and I’d argue that C++ is the best language to learn DSA in still.
  - **YetMoreSpaceDust** (2↑): ChatGPT.ask("reverse this array" + array);
  - **Eric848448** (2↑): Coding with a marker is still a thing. I just did it at an interview last month.
- **darksparkone** (10↑): As an "old generation" dev I found it almost an expertise insult level simple, but I could also imagine it's my experience with languages extensively using 'for' loops speaking.

The brain sticks to the way it seen and used. I won't be surprised if this problem is genuinely hard even for decent engineers who only works with modern languages full of syntax sugar - just the way a lot of smart people struggle with "what is heavier: a ton of foam or a ton of iron" kind questions first time.

Ultimately it has the same problem the Leetcode/DS&A questions have, you test if a person know some specific knowledge that is almost never applicable in their day to day work.

I don't have a huge interviewing experience, but as an idea giving a piece of code to review and fix may work. Add some "solid" issues (doesn't do what is specified, real incorrectness), sprinkle with code smells, inconsistent coding style, hard to read parts, and see what the candidate is able to pick.

A short live programming with a real tiny task, and unlimited tools also worked for me, but it requires bigger time frame, and may weed out some good candidates due to pressure/anxiety.
- **Traveling-Techie** (8↑): If the array is extremely large I might propose putting just one copy in an object and having two accessor methods, for indexing both normally and in reverse.  But that’s just me.
  - **Inner_Butterfly1991** (12↑): See this is an example of an expectation that might be better to ask a more senior applicant but I would consider too difficult for a junior applicant. Like at my level I could absolutely have that discussion and I agree with you depending on requirements it would make sense and we could discuss all the different tradeoffs of various designs. Expecting a junior level applicant to do that? Maybe a bit much imo.
    - **FeralWookie** (7↑): Even as a senior I feel like is possible you haven't ran into memory space issues or disk space issues so often that this immediately comes to mind. But I think it is 100% reasonable for CS student to grapple with a corner case like this. Assume the data set is too large for memory. How would you modify your algorithm.

Almost anything that comes down to raw data structures manipulation. I would expect a fresh grad to often be stronger. As this your every day learning in CS.  Maybe the senior will think of more issues that could crop up for a canned libraries as they get used by people in different environments. Which is what I assume your are getting at here.

I think most company interviews get weeding out senior devs right. They dig into system design sessions. Which is a big chunk of our day. Discussing the current state of a system and figuring out what needs to be added, removed or fixed. And what is feasible to meet all our deadlines and requirements that wont leave us screwed after the current dead line is meet.
    - **[deleted]** (1↑): I don't believe this at all. I have 3 internships, major projects and still struggle. No way in hell is this the bar.
- **[deleted]** (24↑): Hiring a programmer who can't reverse an array would be like hiring a Formula 1 driver who can't check the tire pressure on his wife's minivan.
  - **hairygentleman** (9↑): more like an f1 driver who doesn't know which way to turn the steering wheel to turn left
  - **Lucky_Clock4188** (4↑): nah, i think leetcode questions are really often silly, especially when they involve things like Floyd's algorithm (which I STILL don't "get"). but this particular question is way more a question of, can you reason and program. it is abstract, but being able to think abstractly is a key skill I think
  - **Blake_Dake** (3↑): I mean, Lando Norris who just became F1 world champion famously does not know what torque is soooo

It's fine using systems, of any kind, as black boxes modules, it helps focusing on what matters at that time
  - **DoingItForEli** (0↑): I would say the better analogy would be like hiring a chief mechanic who can't do one of the jobs a member of his team handles. It's easy for a chief mechanic to just say "well I have someone to do that for me" just as a software developer might say that of ChatGPT. When things go wrong though that chief mechanic needs to recognize why faster than any other member of the team, and he needs to know every member's job. 

A good driver knows how to report what they're feeling in the car properly so a member of the crew can make adjustments, and know the limits of the car and how to drive it, but they don't necessarily need to be someone who can hop out and do ANY technical task. They are more like a cohesive class that focuses on a specific task.
- **aabajian** (3↑): I did a similar thing when I interviewed applicants. I asked them to load a text file and count how many times a word appeared. This was before ChatGPT and I let them use *any* resource they wanted. If they could find a Stack Overflow post that had the entire answer, fine by me. All they had to do was copy and paste it.

It was astounding how many applicants couldn’t do the above. This was for a medical software company. So many applicants were from “soft biosci science” degrees - biomedical engineering, computational biosciences, biomedical informatics, etc. I’m not sure these degrees are teaching the basic programming skills needed to do many jobs.

On the flip side, the computer science graduates had generally done the above in their CS 101 class and thought it too easy.
- **dayeye2006** (3↑): I work on compilers and high performance computing. I found leetcode questions are quite related to what I work on.
