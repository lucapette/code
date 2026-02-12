function Link(el)
  if string.match(el.target, "^%d") then
    print(el.target)
    title = string.find(el.target, "#.*")
    if (title ~= nil) then
      el.target = string.sub(el.target, title)
    else
      el.target = "#" .. string.sub(el.target, 3, -4)
    end
  end
  return el
end