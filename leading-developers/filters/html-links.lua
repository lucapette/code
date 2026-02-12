function Link(el)
  if string.match(el.target, "^%d") then
    el.target = string.sub(el.target, 3)
    if (string.match(el.target, "#")) then
    el.target = string.gsub(el.target, "#", "/")
    else
      el.target = string.sub(el.target, 0, -4)
    end
    el.target = "/" .. el.target .. ".html"

    print(el.target)
  end
  return el
end