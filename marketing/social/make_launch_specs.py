"""Writes the JSON specs for the data comparison launch posts and the giveaway (series 2).
Content comes from the owner's Data Logger page screenshots. Run once; edit the JSON after."""
import json
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'posts')
SOON = '<div class="label" style="margin-top:18px;">Coming soon</div>'


def card(title, text):
    return (f'<div class="card" style="padding:12px 14px;"><h3 style="font-size:13px;font-weight:700;color:var(--ink);'
            f'letter-spacing:-0.01em;">{title}</h3><p style="font-size:11px;line-height:1.45;margin-top:3px;">{text}</p></div>')


def grid(*cards):
    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px;">' + ''.join(cards) + '</div>'


def step(n, title, text):
    return f'<div class="step"><span class="n">{n}</span><div><h3>{title}</h3><p>{text}</p></div></div>'


def logger(name, sub):
    return (f'<div class="card" style="padding:10px 12px;"><b style="font-size:12px;color:var(--ink);">{name}</b>'
            f'<p style="font-size:10px;line-height:1.3;margin-top:2px;">{sub}</p></div>')


posts = []

# 1. Teaser
posts.append({'slug': 'post-s2-01-teaser', 'title': 'Something is coming', 'slides': [
    {'label': '', 'html': '<div class="spacer"></div><div class="label" style="margin-bottom:12px;">Data</div>'
     '<h1 style="font-size:34px;">Something is coming.</h1>'},
    {'label': 'A clue', 'html': '<h1 style="font-size:27px;">Your logger. Your teammate\'s logger.</h1>'
     '<h1 style="font-size:27px;margin-top:8px;color:var(--purple);">Different brands.</h1>'
     '<p style="margin-top:18px;font-size:14px;">Until now, that meant two sets of data that never meet.</p>'},
    {'label': 'Kart Connect', 'html': '<div class="spacer"></div><h1>Every logger brand. One screen.</h1>' + SOON +
     '<div class="spacer"></div>'},
], 'captions': [
    'Something is coming.\n\nYour logger and your teammate\'s logger don\'t have to be the same brand to be on the same screen.\n\nComing soon to Kart Connect.\n\n#karting #kartracing #datalogging',
    'Different loggers. Same screen. Soon.\n\nWe\'ve been building something for everyone who has ever tried to compare data across two brands. More to show you shortly.\n\nkart-connect.com\n\n#karting #kartsetup #motorsport',
]})

# 2. The problem
posts.append({'slug': 'post-s2-02-the-problem', 'title': 'One brand, one app', 'slides': [
    {'label': '', 'html': '<div class="spacer"></div><h1 style="font-size:32px;">Different logger. Different software. No comparison.</h1>'},
    {'label': 'The problem', 'html': '<h1 style="font-size:26px;">Every brand has its own desktop software.</h1>'
     '<ul class="dash" style="margin-top:16px;"><li>AiM reads AiM files.</li><li>Unipro reads Unipro files.</li>'
     '<li>Alfano reads Alfano files.</li><li>Starlane reads Starlane files.</li></ul>'},
    {'label': 'The problem', 'html': '<h1>Teammate on a different brand?</h1>'
     '<p style="margin-top:18px;font-size:14px;">Your laps and theirs can\'t sit side by side. Switching logger brand means starting your analysis again in a new app.</p>'},
    {'label': 'Kart Connect', 'html': '<div class="spacer"></div><h1>That is about to change.</h1>'
     '<p style="margin-top:16px;font-size:14px;">One screen for every major logger brand.</p>' + SOON + '<div class="spacer"></div>'},
], 'captions': [
    'Different logger. Different software. No comparison.\n\nAiM, Unipro, Alfano and Starlane each come with their own desktop software, and each one only reads its own files. If your teammate runs a different brand, your data never meets.\n\nThat is about to change. Coming soon to Kart Connect.\n\n#karting #datalogging #kartracing',
    'Ever tried to compare your data with a teammate on a different logger?\n\nSomething one of a kind is coming to Kart Connect. Every major logger brand, one screen.\n\nkart-connect.com\n\n#karting #kartsetup #motorsport',
]})

# 3. The reveal
posts.append({'slug': 'post-s2-03-reveal', 'title': 'Every logger, one screen', 'slides': [
    {'label': '', 'html': '<div class="spacer"></div><div class="label" style="margin-bottom:12px;">Data Logger</div>'
     '<h1 style="font-size:32px;">Every major logger brand. One screen.</h1>'},
    {'label': 'Drop it in', 'html': '<h1 style="font-size:24px;">Export a CSV. Drop it in.</h1>'
     '<p style="margin-top:10px;">Mix brands and drivers in one go. The brand is detected automatically, with nothing to set up.</p>'
     '<div style="margin-top:20px;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.10);border:1px solid var(--rule);">'
     '<img src="assets/shots/logger-drop.png" style="display:block;width:100%;"></div>'},
    {'label': 'Supported loggers', 'html': '<h1 style="font-size:24px;">Works with the logger you already run.</h1>'
     '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px;">'
     + logger('AiM MyChron 5 / 5S', 'GPS + G-force') + logger('AiM MyChron 6', 'GPS + G-force')
     + logger('Alfano Pro 6 / 7 / 8', 'GPS on Pro 6 GPS model') + logger('Unipro 6003 / 6004', 'GPS + optional steering angle')
     + logger('Starlane Stealth GPS', 'GPS') + logger('Starlane Davinci', 'GPS + G-force') + '</div>'},
    {'label': 'What you see', 'html': '<h1 style="font-size:24px;">Every lap, every trace, every sector.</h1>' + grid(
        card('Lap time comparison', 'All laps in one ranked table, best lap highlighted, delta to fastest.'),
        card('Speed trace overlay', 'Speed against distance for every lap on one chart.'),
        card('GPS track map', 'Your racing line, colour-coded slow to fast. Overlay drivers.'),
        card('Sector analysis', 'Split into three sectors, with the fastest in each highlighted.'),
    ) + SOON},
], 'captions': [
    'Every major logger brand. One screen.\n\nExport a CSV from AiM, Unipro, Alfano or Starlane and drop it into Kart Connect. The brand is detected automatically. Mix brands, mix drivers, and see every lap, speed trace and sector side by side.\n\nComing soon.\n\n#karting #datalogging #kartracing',
    'Your teammate runs a different logger. It no longer matters.\n\nThe Kart Connect Data Logger reads AiM MyChron, Alfano, Unipro and Starlane files on one screen: lap tables, speed traces, GPS racing lines and sector analysis.\n\nComing soon. kart-connect.com\n\n#karting #kartsetup #motorsport',
]})

# 4. Video in sync
posts.append({'slug': 'post-s2-04-video', 'title': 'Video, in sync', 'slides': [
    {'label': '', 'html': '<div class="spacer"></div><h1 style="font-size:32px;">Watch the lap.</h1>'
     '<h1 style="font-size:32px;margin-top:8px;color:var(--purple);">See the delta.</h1>'},
    {'label': 'Video comparison', 'html': '<h1 style="font-size:26px;">Two drivers. Two clips. Perfect sync.</h1>'
     '<p style="margin-top:16px;font-size:14px;">Load footage for two drivers and watch both side by side. A live delta counter shows who is ahead and by how much, updated as the video plays.</p>'
     '<div style="margin-top:14px;"><span class="pill">Live delta</span><span class="pill">GPS sync</span><span class="pill">Frame-accurate</span></div>'},
    {'label': 'Your camera', 'html': '<h1 style="font-size:24px;">No manual trimming.</h1><div style="margin-top:12px;">'
     + step('G', 'GoPro Hero 7 to 12', 'Uses the GoPro\'s built-in GPS timestamp to line your footage up with your logger data automatically. GPS must be on.')
     + step('D', 'DJI Osmo Action 3 / 4 / 5', 'Drop in the .srt file your Osmo Action records with the video. GPS and timestamps are synced to your logger data.')
     + '</div>'},
    {'label': 'Kart Connect', 'html': '<div class="spacer"></div><h1>Data and video, on the same timeline.</h1>' + SOON + '<div class="spacer"></div>'},
], 'captions': [
    'Watch the lap. See the delta.\n\nLoad footage for two drivers and watch them side by side, with a live delta counter showing who is ahead and by how much. GoPro Hero 7 to 12 footage lines up automatically from its GPS timestamp, and DJI Osmo Action 3, 4 and 5 sync through the .srt file.\n\nComing soon to Kart Connect.\n\n#karting #datalogging #gopro',
    'No more trimming footage by hand.\n\nKart Connect lines your onboard video up with your logger data and plays two drivers side by side, frame-accurate, with a live delta.\n\nComing soon. kart-connect.com\n\n#karting #kartracing #motorsport',
]})

# 5. Perfect lap
posts.append({'slug': 'post-s2-05-perfect-lap', 'title': 'Your perfect lap', 'slides': [
    {'label': '', 'html': '<div class="spacer"></div><h1 style="font-size:32px;">What does your perfect lap look like?</h1>'},
    {'label': 'Theoretical best', 'html': '<h1 style="font-size:24px;">Your three best sectors, from any lap.</h1><div style="margin-top:12px;">'
     + step('1', 'Fastest Sector 1', 'From whichever lap you set it on.')
     + step('2', 'Fastest Sector 2', 'Even if it came in a different session.')
     + step('3', 'Fastest Sector 3', 'Combined into one theoretical best lap.')
     + '</div><p style="margin-top:12px;">See which sector costs you time, and which you already own.</p>'},
    {'label': 'Kart Connect', 'html': '<div class="spacer"></div><h1 style="font-size:28px;">See where your time is going.</h1>'
     '<p style="margin-top:16px;font-size:14px;">Export to GPX, KML or CSV when you want to take it further.</p>' + SOON + '<div class="spacer"></div>'},
], 'captions': [
    'What does your perfect lap look like?\n\nKart Connect takes your fastest Sector 1, Sector 2 and Sector 3, from any lap and even across sessions, and combines them into your theoretical best. Then sector analysis shows where the time is.\n\nComing soon.\n\n#karting #datalogging #kartracing',
    'Your best lap is already in your data. It is just split across three laps.\n\nTheoretical best lap and sector analysis, coming soon to the Kart Connect Data Logger.\n\nkart-connect.com\n\n#karting #kartsetup #motorsport',
]})

# Giveaway
posts.append({'slug': 'post-s2-06-giveaway', 'title': 'Giveaway', 'slides': [
    {'label': '', 'html': '<div class="spacer"></div><div class="label" style="margin-bottom:12px;">Giveaway</div>'
     '<h1 style="font-size:34px;">Win a year of Kart Connect.</h1>'},
    {'label': 'How to enter', 'html': '<h1 style="font-size:26px;">Three steps to enter</h1><div style="margin-top:14px;">'
     + step('1', 'Like this post', '')
     + step('2', 'Share it to your story', '')
     + step('3', 'Tag a karting friend in the comments', 'Each comment with a tag is one entry.')
     + '</div>'},
    {'label': 'The prize', 'html': '<div class="spacer"></div><h1>12 months of Privateer, free.</h1>'
     '<p style="margin-top:16px;font-size:14px;">One winner, picked at random when the giveaway closes. Closing date and terms in the caption.</p>'
     '<div class="spacer"></div>'},
], 'captions': [
    'Giveaway: win 12 months of Kart Connect Privateer.\n\nTo enter:\n1. Like this post\n2. Share it to your story\n3. Tag a karting friend in the comments. Each comment with a tag is one entry.\n\nCloses [CLOSING DATE] at 23:59 UK time. One winner picked at random and contacted by DM from this account. 18+, UK only. No cash alternative. This promotion is not sponsored, endorsed or administered by Instagram.\n\n#karting #giveaway #kartracing',
    'We\'re giving away a year of Kart Connect.\n\nLike, share to your story, and tag a karting friend in the comments to enter. One winner gets 12 months of Privateer, free.\n\nCloses [CLOSING DATE] at 23:59 UK time. Winner picked at random and contacted by DM from this account. 18+, UK only. Not sponsored, endorsed or administered by Instagram.\n\n#karting #giveaway #motorsport',
]})

for p in posts:
    json.dump(p, open(os.path.join(OUT, p['slug'] + '.json'), 'w'), indent=2, ensure_ascii=False)
    print(p['slug'], len(p['slides']))
