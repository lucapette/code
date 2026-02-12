function Pandoc(doc)
  local headersIndexes = {}

  -- find all headers
    for i,el in pairs(doc.blocks) do
        if (el.t == "Header" and el.level == 1) then
           table.insert(headersIndexes, i)
        end
    end

    for i,index in pairs(headersIndexes) do
      table.insert(doc.blocks, index+i-1, pandoc.RawBlock('html', '<div id="chapter' .. i-1 .. '" class="pagebreak"></span>'))
  end
  return pandoc.Pandoc(doc.blocks, doc.meta)
end