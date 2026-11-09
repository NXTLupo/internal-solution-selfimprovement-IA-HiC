---
id: social-intelligence/reddit-deep/graphic_design/1nh55ea.md
url: "https://www.reddit.com/r/graphic_design/comments/1nh55ea/urgent_packaging_design_best_pdf_file_type_to/"
kind: "social-post"
source: "reddit-deep: r/graphic_design"
subreddit: "graphic_design"
title: "[URGENT] [Packaging Design] best PDF file type to send out for Cromalin color proof?"
author: "Acceptable_Slip4717"
date: "2025-09-14T22:38:46.000Z"
score: 1
upvote_ratio: 0.67
num_comments: 11
flair: "Asking Question (Rule 4)"
extracted_at: "2026-08-25T23:08:58.873Z"
extraction_method: "praw-deep"
research_goal: "Identify high-converting email design patterns and product marketing trends for 2026 to guide the template redesign of a clean, organic cosmetics and skincare brand targeting Gen Z."
engagement: "identify-high-converting-email-design-patterns-and-product-m"
chunks:
  - id: "social-intelligence/reddit-deep/graphic_design/1nh55ea.md#c0"
    char_span: [0, 1285]
    sentence_count: 11
    key_terms: [comments, color, done, packaging, cromalin, sticking, english, library]
    concepts: [comments, color, packaging, cromalin, sticking]
    related_chunks: ["social-intelligence/reddit-deep/graphic_design/1nh55ea.md#c1"]
    token_count: 301
    sources: [{"n":"reddit-deep: r/graphic_design","u":"https://www.reddit.com/r/graphic_design/comments/1nh55ea/urgent_packaging_design_best_pdf_file_type_to/"}]
  - id: "social-intelligence/reddit-deep/graphic_design/1nh55ea.md#c1"
    char_span: [1300, 3551]
    sentence_count: 18
    key_terms: [color, printing, representation, separations, cromalin, plastic, offset, vendor]
    concepts: [color, printing, representation, separations, cromalin]
    related_chunks: ["social-intelligence/reddit-deep/graphic_design/1nh55ea.md#c0"]
    section: Comments
    token_count: 500
  - id: "social-intelligence/reddit-deep/graphic_design/1nh55ea.md#c2"
    char_span: [3553, 5316]
    sentence_count: 15
    key_terms: [color, coated, profile, flimsy-masterpiece08, paper, using, cmyk, generic]
    concepts: [color, coated, profile, flimsy-masterpiece08, paper]
    section: Comments
    token_count: 439
---
# [URGENT] [Packaging Design] best PDF file type to send out for Cromalin color proof?

Source: [reddit-deep: r/graphic_design](https://www.reddit.com/r/graphic_design/comments/1nh55ea/urgent_packaging_design_best_pdf_file_type_to/)
Posted by **Acceptable_Slip4717** · **1↑** · **11 comments**

Sorry in advance for potentially wonky use of technical terms, English is not my first language, etc...

I’m a junior designer who, by circumstance, was thrown into a packaging design gig head-first, all on my own. The printing will be done in another country, where the product itself is made and so far the typography has been graciously helping me with revising & fixing my layout. Since they speak no English, all communication is done thru our manager, who said that their only comments on the needed color profile were "CMYK" and "coated". Im sticking with the PANTONE CMYK COATED library, so hopefully I'm on the right track. 

Thing is -- their color proof will be done with Cromalin. Which exact PDF format will be the best to send to them for that? Plus, am I doing the right thing by sticking with the PANTONE library?

I've already had one round of revisions and I have ~6 hrs to hand in the documents again. Would love to hear anything from anyone with experience in the field.

## Comments

- **Marquedien** (5↑): If the print vendor says CMYK that means no colors should be set to spot separations. You can use the Pantone coated color bridge as guidance, but all of the colors should be set to their CMYK values.

If the vendor doesn’t request a PDF/X file, the High Quality Print setting is suitable for just about any printing. What you can do is Save a Copy as PDF, and use the Offset Color Preflight tool in Acrobat to see if there are any warnings or errors. The report will included a list of color separations. There should be 5 separations for packaging: Cyan, Magenta, Yellow, Black, and the Die (if the die separates cutting and folding there might be a sixth separation). You can include the preflight report with the production pdf as a way of informing the vendor that you know what’s going on and if it’s something minor, like a 280 dpi image, are ok to proceed with it.
  - **Acceptable_Slip4717** (1↑): I think I got it... Thank you!
    - **Marquedien** (1↑): Glad to help.
- **Flimsy-Masterpiece08** (1↑): Okay so 20 years here and I’ve never worked with cromalin. 

Here’s what google sent:

“Original Cromalin Proof Single ...
A Cromalin print proof was an off-press color proofing method, created by duPont, that used a photographic process to produce a single-sheet color representation of a final offset printing job before going to the actual printing press. It involved exposing photosensitive plastic layers with a color separation negative, then applying CMYK-colored toners in the image areas and laminating them together to simulate the final printed output. While it provided a good representation of color and registration, the process was complex and has since been almost entirely replaced by faster, cheaper, and more efficient digital proofing methods.”

Why would they use this? Essentially they’re using cmyk in visually additive mode not subtraction. Meaning shiny color plastic is gonna look more vibrant than just printing on paper which will look duller. In offset printing - not digital printing - each color is a separate plate. So each plastic layer is a representation of a plate layer. Then maybe you lay it on white paper to see what it’s supposed to look like? I learned something new today! 

I think using pantone cmyk color matching will do you just fine. The coated is referring to the paper stock as in it’s not matte or silk or some other type of material. Coated white paper is going to give you the closest reproduction to what you see on screen as the ink won’t sink deep or dull out. But yes that’s why ‘coated cmyk’ is a Pantone designation- the big color books / chips will show you an accurate color match using coated paper.

As for PDF - you should be able to export out with the color profile. It’s a checkbox on export. I’m assuming you’re using Indesign?
  - **Flimsy-Masterpiece08** (1↑): Honestly, I’d be surprised if they are actually using chromalin. It may be just in their country that has become the generic term for digital proof just like Kleenex means tissues.
  - **Acceptable_Slip4717** (1↑): Huh, thank you! I'll probably send the files in the PDF/X-1a format, or something along those lines, as it seems to be the most "foolproof" for printing...according to the internet, at least. Forgot to mention: the packaging will be plastic - LDPE, to be exact... 
To another reply: I actually never considered the "generic term" angle of it, come to think of it
    - **Flimsy-Masterpiece08** (1↑): Oooohh!! Maybe that’s why! Is the packaging clear? You’re printing on plastic vs paper so that makes way more sense on the process!
- **keterpele** (1↑): >... who said that their only comments on the needed color profile were "CMYK" and "coated".

"CMYK" is the color mode and "coated" is the stock type. sounds like they are telling you what color profile you should be working with. they might be referring to a specific color profile which they use for print, or they might be telling you to use a generic profile with those specs.
