# Teams

> Anticipate reorganisation by constantly evolving a meaningful structure.

Scaling up organisations is often driven by pain. We move fast, hire a lot, and
at some point we realise that the way we operate isn't working anymore.
Unfortunately, there is no quick fix because we scale up by splitting teams or
by restructuring them, and these processes take time. If you're feeling the pain
now, you failed to anticipate your needs six, maybe twelve months ago.

Often, we aren't only reorganising too late, we're also executing changes
poorly. The weeks following the changes are chaotic. No one knows who is
responsible for what anymore. The new teams don't have a clear mission. It's
not clear who is supposed to maintain that legacy system that keeps breaking.

I may be negatively biased on the topic of radical reorganisation because I've
seen a lot of badly executed reorganisations. I've been part of newly created
teams named after desks, colours, floor numbers, programming languages used; the
most nonsensical splits and structures you can imagine. It's depressing to see
how little some leaders care about organisational design. And yet structuring
teams in a coherent and efficient way has a major impact on the overall success
of the organisation.

The starting point of designing a good structure is accepting that no structure
is durable. Nothing works forever when you are trying to organise human beings.
Once you accept that static structures can't make the cut, you can shift your
attention from designing the right structure for today to constantly _evolving_
the existing structure into a better one.

To facilitate this process, I suggest you build teams with the following
properties:

- A formal definition: a name and a mission statement

  The fact that each team needs a name is obvious. So obvious that we don't give
  enough attention to it. The purpose of a mission statement is to ensure
  everyone inside _and_ outside of the team knows what the team does and what
  they're responsible for. I suggest you come up with a short name and a one–two
  sentences mission statement. Writing clearly is hard, but the challenge here
  is that you really need brevity, too. If team names are too long, people will
  shorten them. Then you have two sets of names and a non-written mapping
  between the two. If the mission statement is more than one or two sentences,
  it won't stick.

- A backlog and a roadmap

  These fulfil different and correlated functions. A backlog tells a team what
  to do _right now_: the tactical goals to achieve in a short period of time. A roadmap
  tells them where they're going: the strategic goals to achieve to fulfill
  their mission.

- No dependencies

  Dependencies between teams can be disruptive to morale and efficiency. For
  example, failing to release a feature because another team wasn't ready with their part on
  time is a recipe for disaster. The resulting tension has a
  strong negative impact on the morale of both teams. People can leave a company
  if this happens often. People feel bad when they're stuck waiting for
  something they can't solve on their own. The more they are committed to the job, the
  worse they feel. It's vital to design structures that give people enough autonomy so
  they don't get stuck waiting on somebody else.

Evolving structures mostly means splitting teams into smaller teams. There are
rare exceptions when it makes sense to absorb a team into another one, but these
situations are too special to have a conversation around them. Splitting is what
you usually do when you reorganise your teams so that's what we're going to
discuss next.

## When to split teams

Before I discuss when to split teams, let's clarify why we split them. There are
two inherent limits to how people can collaborate efficiently. Let's examine
these limits one by one.

The first limitation is how many direct reports a leader can have _and_ still do
a good job. Every leader has a slightly different threshold for direct reports,
but everyone has an upper limit. There is no hard rule for this, so there is no
math formula. For example, I experienced that each direct report requires 10 to
15 percent of my time every week. Six to eight direct reports leave me with no
time to take care of "everything else". Based on that, I believe it's hard to
imagine that anyone could run a team with more than 12 people _and_ still do a
good job.

The other limit concerns the size of a single team before the communication
overhead becomes too much of a burden. The limit is much stricter here and a
direct consequence of communication complexity growth. I call this ["The links
formula"](3-communication.md#the-links-formula). The formula gives a strong
indication: five to six people is a reasonable upper limit for how big a single
team can be before things get too complicated.

These limits tell us two things:

- A team should have no more than 6 people to function well.
- One engineering manager can't run more than two or three teams.

Does that mean you should split as soon as you hit these limits? Unfortunately,
it's not that easy. If you hit the limit, it's already too late to change
("better late than never" still applies). Furthermore, because we're late, we
start rushing into taking a decision and then end up with a split that isn't
good enough. The first few months after a rushed split look like this: people
have no clue who is doing what, product managers don't know anymore what backlog
they are supposed to fill, engineering managers worry that nothing is happening
in such a chaotic situation, so they constantly check on the progress and end up
annoying everyone. In short, everything was nicer before we split. To make
things even more complicated, you can't split as soon as you have 7 people in
one team. You would end up with teams that are too small and too hard to
operate. For example: a team of three people almost never functions properly. It
lacks resiliency to holidays, people getting sick, and so on.

This situation seems to have no solution:

- You can't split up too late because it leads to chaos.
- You can't split up too early because tiny teams don't function well.

It's tricky because we frame structural changes as a point-in-time change. There
is a "before we split" and an "after we split" phase. The key is to frame the
problem as _evolution_ of the structure. Evolutions are slow _but_ constant
processes: we constantly work on splitting teams.

Share your ideas with the team, give everyone the time to understand _how_ you
want to split and _why_ you need to do it. Keep your split proposals in mind
when hiring, share with your potential hires how you intend to split teams, ask
for feedback; outsiders' feedback can be extremely valuable. This continuous
exercise prepares you and the team for what I call "the hard split". It's a
plain name for the actual day in which you start using new backlogs and
roadmaps, change the sitting plan (if relevant), and formally introduce the new
teams. The goal is to shorten as much as possible the transition period that
follows the hard split.

Some confusion is inevitable because structural changes are complicated. Don't
expect the smoothest process, prepare as much as possible for it. Here's
what to look out for:

- Who joins what team?
- What's the mission of the new teams?
- What are the names of the new teams?

The first point is a matter of communication and feedback. As a leader, you
surely can come up with a good new structure, but asking the people involved is
a necessary step. Good leadership isn't convincing people to go where you want
them to go. It's understanding where people want to go and helping them get
there. Sometimes asking for feedback will surprise you. The reasons why some
people may want to move to another team are gold for leaders. They provide great
insights into your teams and how to better organise them.

The last two points are about _how_ to split teams. The topic is worthy of its own
paragraph.

## How to split teams

There are a few things to keep in mind when it comes to splitting teams.

First of all, consider [Conway's
law](https://en.wikipedia.org/wiki/Conway%27s_law):

> Organisations that design systems are constrained to produce designs that are
> copies of the communication structures of these organisations.

This is helpful information. You can use it to the advantage of the entire
organisation. Depending on the stage of the company or the industry
your company is in, some architectural decisions work better than others. So you can flip
the information the law provides: only specific organisational structures
produce the architecture that fits your context better. The idea is to help
design a large system by organising teams so that they naturally (as in
according to Conway's law) design the system correctly.

With this in mind, the whole process of splitting teams becomes a quest for a
good splitting criteria. The criteria need the same brevity and clarity that a
team's name and mission need. Splitting has to be meaningful and it's tricky
because some splits only make sense on the surface.

A common example is splitting teams by platform boundaries: the typical one-to-one
mapping between team names and platform parts. You have a backend team, an
API team, a frontend team, and so on. This split seems meaningful, but it
forces your teams to keep the existing architecture as is and, far
worse, it bounds the future organisational design of your teams to your
technical decisions. Last but not least, it make no sense to people outside of
product development.

Finding the right split is a quest for simplicity. As I often say, simple isn't
easy. This problem needs strategic thinking. My suggestion is to sketch on
a whiteboard what your teams would look like under different splitting
criteria. Then you benchmark each split using this checklist:

- Does the split make sense to the rest of the company?
- Do your product managers buy the split?
- Can you picture how to split teams further from here?

The order of questions is not relevant here, but they all need a clear, positive,
and strong answer.

In my experience, the best approach is to search for inspiration in the business
model. Loosely mapping the teams to the various parts of the business model has
a few intriguing benefits:

- You can align the strategic goals of the company with your hiring strategy.
- The business model changes slowly, yet it may change often. The more an organisation
  understands its market, the more it adapts its business model to it.
  Structurally adapting to these changes is a powerful tool because the it
  resonates with the entire organisation.
- The roadmaps of your teams mirror the overall strategy of the company.
- Naming makes sense for everyone. The name "API team" doesn't tell
  much about the team to the people outside of the product development. The name "Driver app team",
  on the other hand, has a meaning both inside and outside of the product development team.
  You also want the meaning to
  be the same for everyone. An amusing example from my career: the "Ops team".
  In one company I worked for, this name created a lot of confusion. We
  managed warehouses ourselves, so the company had another "Ops team". We ended
  up renaming _our_ Ops team to "Platform team" which, no surprises here, was also a
  more accurate name.

Another way of validating splits is picturing how the new product
roadmaps would look like. I'm purposely ignoring backlogs because they cover
what a team needs to do _right now_ or in the immediate future. Splitting teams is
about a long-term strategy.

I left the most important aspect of a split out of this conversation, so that I
could give it the right space before we move on to a different topic. Whatever
way you split, diversity is the key factor for the future successes of your
teams. You don't want to split in a way that some teams become too homogeneous.
These teams rarely innovate and their failures can create unpleasant dynamics in
the organisation. Sketching different splits on some whiteboards helps with
diversity, too. Try sketching different splits with people's names. They are
only sketches for now, so don't sweat it trying to get it right. It's OK to put people in
teams without having involved them yet. The point of sketching isn't to come up
with a decision, it's to get a sense of what you can and can't do.

Depending on how you split, it may make sense to have teams with, say, no
JavaScript skills. Every time you split, you specialise teams further. Smaller
teams can achieve more by having a more focused roadmap and backlog. Therefore,
as you scale, hyper specialisation is somewhat expected.

As the discussion may feel a little too abstract, let me share two examples. In
both examples, we start with one team and work out a way to split the teams further
as they grow.

### Marketplace

In the words of [Wikipedia](<https://en.wikipedia.org/wiki/Market_(place)>), a
marketplace is:

> A location where people regularly gather for the purchase and sale of
> provisions, livestock, and other goods.

Reading the history of markets is fascinating! They have always existed so it's
only natural that many companies create digital marketplaces.

Marketplaces deal with two completely separate groups of users: buyers and sellers. Each
group has its own needs. So, even at the earliest stages, the natural split that
comes to mind is:

- Sellers team
- Buyers team

I picked marketplaces as one of my examples because it leads to an interesting
conversation despite how "obvious" the first split is.

Let's benchmark this approach with the checklist I proposed in the previous
section.

- Does the split make sense to the rest of the company?

  The split is natural to the people outside of the product development
  organisation.

- Do your product managers buy the split?

  Product managers can often draw a clear line between the features for sellers and
  those for buyers. The two teams share important parts of the data model, which
  may be worrisome at first. For example, buyers place orders and sellers fulfil them.
  With a two-team split, Conway's law does its magic. To avoid getting in each
  others's way, the two teams agree to build a system with some message bus
  as a boundary. The buyers team places orders in their system and notifies the
  sellers team about it. The sellers team takes it from there and notifies the
  buyers team about changes in the fulfillment process. Each team has their own
  data model and their contract is clear: the buyers team is responsible for
  producing the correct order of events and the buyers team is responsible for consuming
  those events.

- Can you picture how to split teams further from here?

  The answer to this question is product dependent, so I can only share how I
  would go about it. Further splits are a matter of focus. For
  example, imagine your company sees offering a richer buyer experience as
  an opportunity to win over competitors. The company strategy gives you the
  hints you need to split teams further. It may make sense to segment or
  specialise features by the kind of buyer. Data analysis may suggest some segments
  to you that are meaningful and relatively stable. Unfortunately, I've seen
  a lot of arbitrary segments in my career, too.

### Subscription business

Subscription-based business models have appealing properties. Revenue streams
are a function of the number of subscribers and, often enough, understanding a
business model's potential is a matter of a few multiplications.

For the sake of this conversation, our subscription business works like this:

- Customers choose a plan.
- Each plan unlocks a set of features for a price.
- Customers buy a plan and are charged monthly for it.

From a user-base perspective, subscriptions are more straightforward than
marketplaces. They have only subscribers. You are either subscribed to a product
or you are not.

In subscriptions, the customer journey is central to the business model. You
want to understand two things: what convinces people to subscribe and what keeps
them subscribed. Here's a trivial breakdown of the customer journey:

- Alice is a potential customer because they're visiting the website.
- Bob started a trial period.
- Zara is a subscriber.

The marketing team of a subscription business often splits their efforts in
acquisitions and subscriptions. The budget allocation for each bucket depends a
lot on the phase the company is in, but you need both. You can't run a
subscription business without:

- Converting leads into subscribers.
- Keep subscribers happy.

This conversation suggests an interesting split:

- Acquisition team.
- Subscription team.

Let's run the checklist again.

- Does the split make sense to the rest of the company?

  You have a team that takes care of the customers before they subscribe and another
  one – after they subscribed. Most likely, the whole company thinks about
  customers that way.

- Do your product managers buy the split?

  The kind of features you need to acquire customers has nothing to do with the
  features you need to keep them, so it should be easy for a product manager to
  imagine distinct roadmaps. Balancing the two roadmaps may be challenging. Of
  course, a subscription business always needs features for its subscription
  base. That's always true for such a business. That said, roadmaps are still
  dependent on what a company's needs are at any given moment. For example, if
  you don't have enough customers yet, you should focus on your acquisition
  efforts. This is often a cyclic process in a subscription business, so the
  hint is to optimise splitting for flexibility.

- Can you picture how to split teams further from here?

  In a successful subscription model, the customer journey tends to become more
  specialised over time. The organisation learns what works for whom and
  optimises the journey. Sometimes this means more waypoints in the journey
  itself, other times this means different journeys for different audiences.
  Those are great hints for further splits. Teams end up creating these journeys
  themselves sometimes. For example, a trial feature can become so successful
  that it can feed an entire team for a year.

## Virtual teams

The two examples I just discussed don't answer an important question: who takes
care of the platform itself? As your team grows, so do your needs for
infrastructure and maintenance.

Platform teams trouble me conceptually because I strongly believe in [No
privileges, no elites](2-culture.md#no-privileges-no-elites). Their work is
different by definition, it _feels_ like elite work. Platform engineering
is horizontal to the whole product development organisation, so they have access to
everything. After all, the whole point is to be a multiplier for everything
else. So it couldn't really work any other way. Virtual teams is how I
reconciled the need for platform engineering and staying true to my "no
privileges, no elites" value.

The idea is doing with teams what you sometimes do with views in a relational
database. Views have the same shape and behaviour of tables, but they often take
data from multiple tables. Virtual teams are the same: they have a name, a
mission, a backlog, and a roadmap. They don't have team members as they are
composed of team members of other teams. They take from multiple teams.

The way you do this is by over-staffing physical teams enough so that they can go on
without a team member or two for a few weeks at a time. Every X weeks team members
go back to their physical teams and new ones
join a virtual team. This seems like a lot of trouble, so why would you want to
do it? Well, I think the benefits overcome the disadvantages:

- Everyone learns enough about whatever the "special" team is doing.
- Everyone practises handover often, a process vital to smoothly managing holidays
  and off-boardings.
- Everyone learns how to run systems and not _just_ build product features on
  top of them.

Scheduling rotations can be a burden on the leaders of the organisation, so I
suggest you ask the teams to help with the scheduling. A major problem with
virtual teams is that it can be complicated to keep them diverse so that
they can do a good job.

A practical approach to simplifying scheduling is to have some "pivot members":
team members that officially belong to a virtual team. I think it would be
fashion nowadays to call them Staff or Principal engineers. Their job is fun,
they get to interact with literally everyone while being focused on their
specialty and roadmap.

Apart from platform needs, virtual teams can also help with short-lived
projects. Here are some examples:

- Complex data migrations

  One way you may end up there is after an acquisition. Your company buys a
  competitor in the space and you have to merge data. These projects are hard,
  they disrupt the flow of physical teams. Virtual teams mitigate the risk by
  isolating the effort.

- Feature peak in one area

  Special sales may have this effect: a bunch of features that would normally
  belong to one team needs special attention. Partnerships with other companies
  may have the same effect.

- Training activities

  Sometimes you migrate to a new technology or change a part of your system to a
  new language. In these cases, not everyone on your team is already trained.
  Such initiatives can help your organisation become self-learning, that's a
  wonderful achievement in itself.

These examples are a testament of how flexible virtual teams are.

## Teams of teams

So far, I equated evolving teams to constantly changing the teams' composition.
The same applies to your leadership style: you can't evolve teams if you are
not evolving the way you lead _at the same time_.

You could say that scaling leadership is like driving. A go-kart responds to
changes almost in real time, a car responds a little slower than a kart. At the
top of this chain we have trucks: they can carry a lot, but they respond
slowly to any change of direction or pace. The point is: the bigger the car,
the slower it responds to change.

Leadership isn't so different. Taking a decision for a small team has immediate
impact: you make a mistake, you notice right away. The bigger the team, the
slower the feedback loop. The increasing amount of communication that bigger teams
need to function slows down the loop.

The problem with this analogy is that it centers the decision-making process
around the leaders. Leading stops being about making direct decisions as soon
you are leading a team of teams. One level of indirection is enough to break the
analogy: as soon as you have more than one team, you aren't really driving. A
team of teams isn't like driving a truck, it's more like being in charge of the
roads where many cars are driving. Leading a team of teams feels more like
building transport infrastructure. Your job to is to free the roads so that
teams can go wherever they have to.

Your focus shifts from people to people infrastructure. Using the transport
infrastructure analogy, you look at your teams and ask yourself:

- Is team A always getting stuck at the same traffic light?
- Is there a shorter way for team B to get to X?
- Do we need a better engine for team C?

Building infrastructure is a game of anticipation and coordination. You observe
your teams to anticipate their needs. Two teams trying to get to different
places can bump into each other somewhere on that bumpy road. You need to fix
the road or find a different route.

It's worth spelling out the strong underlying assumption of this approach: you
_know_ what it's going on within your teams. It sounds obvious in theory but, in
practice, there isn't anything obvious about it.

For starters, your teams must be observable. You don't want to ask them for
metrics every week or have them check in with you regularly. In the culture
chapter, I discuss the principle "Share everything by default". The idea is to make
public information as accessible as possible. It's fair to expect your teams to
share public information by default; it's a better deal than going around asking
or trying to come up with some metrics and processes. It's also crucial that teams
make their public information readily available.

When teams share information about their decisions, their problems, their
successes, you start seeing patterns. Different teams travel via different roads
to get to different places. But they're all travelling, so they all have travelers'
problems. "Sharing everything by default" is how you gather data. You can help
your team leaders to spot patterns and come up with an action plan. Change is
easier to sell if you can back it up with data.
