---
id: social-intelligence/reddit-deep/vanguardinvestments/1pbk1hp.md
url: "https://www.reddit.com/r/VanguardInvestments/comments/1pbk1hp/how_to_reset_from_trusting_browser_without/"
kind: "social-post"
source: "reddit-deep: r/vanguardinvestments"
subreddit: "vanguardinvestments"
title: "How to reset from trusting browser (without deleting non-vanguard.com browsing data)?"
author: "DanSWE"
date: "2025-12-01T18:08:32.000Z"
score: 2
upvote_ratio: 1
num_comments: 6
flair: ""
extracted_at: "2026-06-11T15:26:17.455Z"
extraction_method: "praw-deep"
research_goal: "Produce the definitive guide to personal investing in 2026 by analyzing the current state of the fintech and financial industries. Evaluate retail investor behaviors, emerging asset classes, and platform shifts using 2026 market news, industry reports, and social media trends to identify actionable investment strategies and market opportunities."
engagement: "produce-the-definitive-guide-to-personal-investing-in-2026-b"
chunks:
  - id: "social-intelligence/reddit-deep/vanguardinvestments/1pbk1hp.md#c0"
    char_span: [0, 2158]
    sentence_count: 6
    key_terms: [browser, vanguard, com, login, application, trust, data, page]
    concepts: [browser, vanguard, application, login, trust]
    related_chunks: ["social-intelligence/reddit-deep/vanguardinvestments/1pbk1hp.md#c1"]
    token_count: 496
    sources: [{"n":"reddit-deep: r/vanguardinvestments","u":"https://www.reddit.com/r/VanguardInvestments/comments/1pbk1hp/how_to_reset_from_trusting_browser_without/"}]
  - id: "social-intelligence/reddit-deep/vanguardinvestments/1pbk1hp.md#c1"
    char_span: [2160, 2824]
    sentence_count: 6
    key_terms: [browser, app, data, vanguard, cookie, com, shopping-cart, associated]
    concepts: [browser, vanguard, cookie]
    related_chunks: ["social-intelligence/reddit-deep/vanguardinvestments/1pbk1hp.md#c0"]
    token_count: 149
  - id: "social-intelligence/reddit-deep/vanguardinvestments/1pbk1hp.md#c2"
    char_span: [2838, 4714]
    sentence_count: 5
    key_terms: [credentials, address, different, browser, combination, trust, get, side]
    concepts: [credentials, address, different, combination, browser]
    section: Comments
    token_count: 409
  - id: "social-intelligence/reddit-deep/vanguardinvestments/1pbk1hp.md#c3"
    char_span: [4716, 6225]
    sentence_count: 11
    key_terms: [browser, profile, user-agent, https, app, primarily, wikipedia, guessing]
    concepts: [browser, profile, user-agent, https, primarily]
    section: Comments
    token_count: 346
---
# How to reset from trusting browser (without deleting non-vanguard.com browsing data)?

Source: [reddit-deep: r/vanguardinvestments](https://www.reddit.com/r/VanguardInvestments/comments/1pbk1hp/how_to_reset_from_trusting_browser_without/)
Posted by **DanSWE** · **2↑** · **6 comments**

Where does Vanguard's web application store the data used to identify a trusted browser profile? (It does not seem to be in browser cookies or local storage for any `*.vanguard.com` domains.)

At a higher level, if you've logged in and told the application to trust your browser (browser profile), how do you revoke that (i.e., tell it to no longer trust that browser) *without* deleting browser site data for *all sites*? 

(Note I'm asking in the context of *not* having set up MFA to challenge at every login. I'll get to that, but right now I'm asking about a different security problem)

\--

When you first log in to Vanguard's web application from a new browser or browser profile, the app challenges you with a texted code and gives you the option to trust the browser in the future. 

If you choose to have the app trust that browser, then next time you log in, it does not challenge you because it trusts the browser, as requested.

However, **if you want to revoke that trust**, that is, tell the application to return to challenging you with a texted code, **how can you do that**?

\--

That web app doesn't seem to have any user interface for doing that (i.e., no continue-to-trust checkbox on login page, nothing on logout page, nothing I found in profile/security pages).  


I tried deleting all browser data (cookies and browser local storage) for [vanguard.com](http://vanguard.com) and all subdomains (e.g., [personal1.vanguard.com](http://personal1.vanguard.com), [login.vanguard.com](http://login.vanguard.com), [logon.vanguard.com](http://logon.vanguard.com), etc.).  (This was in Chrome, on the site permissions page where you can select specific domains whose data to delete.)

When I refreshed a recently opened Vanguard app page, it took me back to the login page, as expected (since I deleted whatever cookie carried my login session token).

However, when I logged in again (via username and password), the app did *not* challenge with a texted code. That is, the *app still trusts the browser*. 

So how does the app identify my browser? I thought that it would be in cookie or other data associated with [vanguard.com](http://vanguard.com) or a subdomain. But I deleted that data, and doing so didn't change whatever the app uses to identity and trust my browser.

(I called customer support, but the only workaround they know of is to delete browser data for *all sites*, which of course messes up other things (discarding login tokens, destroying shopping-cart cookie data, etc.).)

Any ideas?

Thanks.

## Comments

- **whynotzoidberg1010** (3↑): you sound paranoid… I like you.

your going to have to spend some time learning about session tokens, authentication tokens, session handshakes, marriage ceremonies (no joke they’re called that when browsers/sessions accept each other as authentic and trusted)…

with all that said it’s going to be a combination of all of the above with other authentication and authorization credentials.  some new ones are data analytics driven (your ip address changed but the geo tag is close enough to your other known ip address we’ll accept it as the same ip address login)

all kinds of cool stuff I really don’t understand

  
edit: to add, all this is on Vanguards side.  when you click “trust this browser“ it saves a combination of these sessions credentials on their end to not prompt for 2FA until a certain time on their side.  I imagine you’ll need to get in touch with their web development team to get your credentials deleted from their trusted server
  - **DanSWE** (2↑): \> this is on Vanguards side. when you click “trust this browser“ it saves a combination of these sessions credentials on their end to not prompt for 2FA until a certain time on their side. 

Yeah, Vanguard should be providing a way in the web application UI to cancel the trust setup (just as they provide the checkbox to trust the browser in the first place), but apparently don't.

The customer service drone I talked to first thought that they did it by IP address (you know, the *same* IP address that my *different* browser profiles, *different* browsers, and *different* computers/phone use, providing *different* behavior.

His only suggestion was global (across all domains) deletion of site data (e.g., cookies, local storage).

\> I imagine you’ll need to get in touch with their web development team to get your credentials deleted from their trusted server

He said no one there talks to customers, but he at least (supposedly) submitted the feedback that they should have a way to undo a "trust this browser" election.
- **Xxyz260** (1↑): I don't know for sure, but I strongly suspect they primarily use your [user-agent](https://en.wikipedia.org/wiki/User-Agent_header). Try changing that with an extension and see if that does anything.
  - **DanSWE** (1↑): \> suspect they primarily use your [user-agent](https://en.wikipedia.org/wiki/User-Agent_header)

Nope. When I created a new user profile in Chrome and logged in from that, the web app didn't initially trust that browser (profile) instance, while it has been doing so in my regular profile.

The user-agent string is going to be the same in all profiles. In fact, it's the same in all instances of a given version of a browser on *multiple* people's computers (well, ignoring overrides via extensions).

Are you thinking of some per-instance browser (profile) identification rather than the normal user-agent string?
    - **Xxyz260** (1↑): Maybe? There's a ton of browser features that can be used for fingerprinting and I was just guessing at the most obvious thing.
- **asr5282** (1↑): Guessing probably device management under the security settings in the profile? Delete the device you are using.

Edit: this appears to only be available in the app. I logged in on my computer and don’t have it there. It’s mentioned here and prompts you to go to the app: https://investor.vanguard.com/security-center
