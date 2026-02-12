---
tags:
  - rails
date: "2012-01-24T00:00:00Z"
description: How you can speed up your controller specs if you're using sorcery
keywords: rails, rspec, factory_girl, sorcery
title: Faster controller specs with sorcery
---

It looks like the entire Rails community is paying attention to the
_testing-is-not-enough-your-tests-should-be-fast_ mantra. And I have to say I
agree with the topic. It's good to focus on speeding up your tests because, as
[Corey Haines](http://coreyhaines.com/) keeps saying, it will help you to focus
on the design of your project. But still I'm convinced you have to concentrate
on the design and business logic first. When your project grows enough and you
get a slow test suite, you should focus on test speed. Practically, I'm just
focusing on the good advice "premature optimization is evil". Always, even when
talking about tests.

Well, having said that, I want to talk about a simple addition I made to my
rspec suite in my latest project. The project has a lot of controllers specs
because it involves many different user types, specific rules and actions that
users can or cannot do. The controllers specs were a bit slow. I wanted to speed
them up a bit and remembered that I'd read somewhere about faster controller
specs with devise. Actually, [Kevin
Rutherford](http://www.kevinrutherford.co.uk/) wrote a great
[article](http://silkandspinach.net/2011/08/07/faster-rails-controller-specs/)
on the topic and I said to myself I could have reproduced the technique with
sorcery.

It's a nice technique, think about it. Sorcery gives you a nice
[helper](https://github.com/NoamB/sorcery/blob/master/lib/sorcery/test_helpers/rails.rb)
for controller spec and you can call it in the following way (supposing you're
using FactoryGirl):

```ruby
login_user Factory(:user)
```

This way you're hitting the database in many ways. Stuff like updating the
fields last_login_at and last_activity_at of your users to the current time.
Generally, this stuff is useless to your specific spec and you can get rid of it
by mocking the user and passing it to the sorcery method. So, using this
technique, you completely mock the user and don't hit the database at all.

Actually I didn't know how many things I had to mock to get it working nicely
with the sorcery helper but I came up with a nice technique. If you do something
like:

```ruby
user = mock_model(User, email: ‘email@example.com')

third_part_code(user)
```

You'll probably get an error like:

```ruby
Mock "User_1001" received unexpected message :foo_method with (:baz, Sun, 22 Jan 2012 19:26:03 UTC +00:00)
```

And it's nice because this error is telling you how the third_part_code method
intends to use your object. So, that's exactly what I did. I passed in a mocked
user to the login_user method provided by sorcery and I found out very quickly
what I needed to mock in order to make it working.

So eventually I created a `spec/support/controller_helpers.rb` with the
following content:

```ruby
module ControllerHelpers

  def stub_login
  user = mock_model User, Factory.build(:user).attributes.stringify_keys

        sorcery_attributes = {
          last_login_at_attribute_name: :last_login,
          last_activity_at_attribute_name: :last_activity_at,
          username_attribute_names: [:username]
        }

        sorcery_config = double "sorcery_config", sorcery_attributes

        user.stub(:sorcery_config).and_return(sorcery_config)
        user.stub(:update_attribute)

        login_user user

  end

end
```

Actually my code is a bit fancier because I have a lot of situations where I
need a particular type of user based on the STI pattern. So, your mileage may
vary but it should be easy enough to adapt the code to other situations.

In any case, do not forget to add the helper to your RSpec configuration with:

config.include ControllerHelpers, type: :controller

Having done that, you just want to change all your:

{{< highlight ruby >}}
login_user Factory(:user)
{{< / highlight >}}

with:

{{< highlight ruby >}}
stub_login
{{< / highlight >}}

And then benchmark your changes. I recommend you to use a git branch (you're
using git, aren't you?) and commit the changes there. In this way, you'll be
able to benchmark the whole thing with something like the following:

{{< highlight sh >}}
git checkout fast-controllers
time rspec spec/controllers
git checkout master
time rspec spec/controllers
{{< / highlight >}}

And if you like the results you get, you have nothing to do but:

{{< highlight sh >}}
git merge fast-controllers master
{{< / highlight >}}
