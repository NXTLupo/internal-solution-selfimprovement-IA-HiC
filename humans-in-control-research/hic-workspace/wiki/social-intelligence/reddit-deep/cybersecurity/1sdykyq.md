---
id: social-intelligence/reddit-deep/cybersecurity/1sdykyq.md
url: "https://www.reddit.com/r/cybersecurity/comments/1sdykyq/how_do_most_orgs_cope_with_selinux/"
kind: "social-post"
source: "reddit-deep: r/cybersecurity"
subreddit: "cybersecurity"
title: "How do most orgs cope with SELinux?"
author: "Tech_User_Station"
date: "2026-04-06T13:16:08.000Z"
score: 5
upvote_ratio: 0.78
num_comments: 11
flair: "FOSS Tool"
extracted_at: "2026-06-20T17:52:50.789Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic outlook report on the global insurance industry in 2026, analyzing how AI adoption, emerging technology trends, and macroeconomic pressures collectively reshape coverage structures and consumer perception."
engagement: "deliver-a-strategic-outlook-report-on-the-global-insurance-i"
chunks:
  - id: "social-intelligence/reddit-deep/cybersecurity/1sdykyq.md#c0"
    char_span: [0, 1318]
    sentence_count: 8
    key_terms: [https, selinux, cybersecurity, comments, lobste, mjd9er, insecurity-of-debian, users]
    concepts: [https, selinux, cybersecurity, comments, lobste]
    token_count: 337
    sources: [{"n":"reddit-deep: r/cybersecurity","u":"https://www.reddit.com/r/cybersecurity/comments/1sdykyq/how_do_most_orgs_cope_with_selinux/"}]
  - id: "social-intelligence/reddit-deep/cybersecurity/1sdykyq.md#c1"
    char_span: [1332, 2496]
    sentence_count: 5
    key_terms: [software, selinux, turn, permissive, module, firm-audience6248, selinux-coloring-, new]
    concepts: [software, selinux, permissive, module]
    section: Comments
    token_count: 301
  - id: "social-intelligence/reddit-deep/cybersecurity/1sdykyq.md#c2"
    char_span: [2498, 4489]
    sentence_count: 13
    key_terms: [what-is-new-in-suse-linux-enterprise-server-16-0, code, used, landlock, opensuse, tw-plans-to-adopt-selinux-as-default, https, suse]
    concepts: [landlock, opensuse, https, configure, extremely]
    section: Comments
    token_count: 486
  - id: "social-intelligence/reddit-deep/cybersecurity/1sdykyq.md#c3"
    char_span: [4493, 4983]
    sentence_count: 2
    key_terms: [disables, machine, selinux, someone, fire, troubleshooting, compromised, jeopardize]
    concepts: [disables, machine, selinux, someone]
    section: Comments
    token_count: 105
---
# How do most orgs cope with SELinux?

Source: [reddit-deep: r/cybersecurity](https://www.reddit.com/r/cybersecurity/comments/1sdykyq/how_do_most_orgs_cope_with_selinux/)
Posted by **Tech_User_Station** · **5↑** · **11 comments**

SELinux is the default Linux Security Module (LSM) framework for RHEL, Fedora and openSUSE. So, many orgs have no choice but to use it for mandatory access control (MAC). From my research, I've come across many complaints about it. [Poor](https://lobste.rs/s/mjd9er/selinux_is_unmanageable_just_turn_it_off#c_mfx9sj) documentation & [usability](https://lobste.rs/s/mjd9er/selinux_is_unmanageable_just_turn_it_off#c_huuym0) are the two main issues I see most users complain about. [Turning it off](https://news.ycombinator.com/item?id=41446964) or using it in permissive mode (logging only) are common workarounds used to make it work smoothly. How does your org deal with it?

SELinux is useful in shrinking the attack surface and reducing the severity of some exploits. But if it requires grinding at it for years to get proficient enough, then most users will not be able to take full advantage of its capabilities.

I don't know much about AppArmor but this [article](https://unix.foo/posts/insecurity-of-debian/) claims SELinux is more robust but at the cost of increased complexity.

## Comments

- **Firm-Audience6248** (15↑): [SELinux coloring book](https://people.redhat.com/duffy/selinux/selinux-coloring-book_A4-Stapled.pdf)
  - **kondenado** (8↑): (Red) Hats off to the creator of this guide.
- **Kamwind** (10↑): SELinux is rather simple, provided the software you need to use is not terribly written and does lots of stuff it should not do.

1) Turn to permissive when doing new software installs.

2) For new software run in permissive mode for a few days.  Turn on the modules for that action that software needs to do, this is the poorly documented part.

3) generate a module for the actions that are logged.

4) Turn back to enforcing and continue to monitor.
- **KlanxChile** (4↑): SELinux is part of CIS hardening benchmark... because it works... in the minute you stop fighting it? it's a 10 second adjustment.
- **roiki11** (2↑): I've honestly never had a problem with it. If it blocks a software audit2allow can build a policy module for it. All automated with ansible.
- **JarJarBinks237** (2↑): Just use whatever your distribution ships (SELinux or AppArmor) for system daemons and utilities. Usually it should require very little tweaking. 

For your own software, your goal should be to reduce as much as possible of the attack surface with as little effort as possible. My recommendations would be: 
- Start with systemd security settings. Read all of systemd.exec's manual page. Configuring ReadWritePaths and Protect* settings will instantly reduce attack surface and make extremely hard any post-exploitation of a vulnerability in your code.
- Next step is landlock. This is the easiest of LSMs to configure. It requires intervention on the code, but hey, it's your code. The point of landlock is that the very developer who knows what the software needs is the one to code landlock restrictions. 
- Only if you want to go further, you can setup AppArmor or SELinux, but I would advise against it unless you have an extremely thorough test suite, otherwise you're going to run into production issues that will instantly get it turned off, ruining your efforts.
- **glitch841** (1↑): It varies, alcohol, excessive junk food etc or just read the man pages and experiment a bit until it starts making sense.

Its a bit of a pain at first but its not too bad once you are used to it.
- **yankeesfan01x** (1↑): I thought OpenSUSE/SUSE used AppArmor?
  - **Tech_User_Station** (1↑): [Tumbleweed](https://news.opensuse.org/2025/02/13/tw-plans-to-adopt-selinux-as-default/), [Leap](https://en.opensuse.org/Release_announcement_16.0) and [SUSE Linux Enterprise](https://www.suse.com/c/what-is-new-in-suse-linux-enterprise-server-16-0/) migrated to SElinux last year.
- **skullbox15** (0↑): Funny you mention this... in the past 10 years or so, I've never used it.  Always just disabled it.  Recently, while doing app dev work, it was still enabled by default on the VM I was using.  I used AI to configure it for webserver use.  It suggested a few changes to directories where I have webpages and php includes in separate folders.  I haven't had time to circle back to dig into the use case, but on paper, it's supposed to be useful.    
  
From what I have in my head, of the webserver is compromised is some way, it's lock the attacker inside the web directory and now allow access to the rest of the machine.
  - **TopTax4897** (2↑): Honestly, if I had the authority to fire someone, I would probably fire anyone who disables SELinux outside of a troubleshooting or initial setup.

  
If someone disables SELinux on a production machine, I would worry about what other corners they are cutting that would jeopardize the company.
