# KISS

Keep it simple. A design should be as simple as the requirement allows.

Kelly Johnson's team at Lockheed was told to design an aircraft an average mechanic could repair in the field with basic tools. C.A.R. Hoare: there are two ways to design software. One is so simple that there are obviously no deficiencies. The other is so complicated that there are no obvious deficiencies. The first is harder, and it is the one to choose.

- A simple solution that meets the requirement beats a clever one.
- Simple code is faster to read, debug, and change. Clever code hides its problems.
- Anything that adds complexity without being required works against this law.
- Each extra line is another place for a defect.

A file parser that opens the file, reads lines, and splits fields is enough until a real case needs a general parser. A plugin architecture for one report is not simple.

Source: Milan Milanović, Laws of Software Engineering, [KISS](https://lawsofsoftwareengineering.com/laws/kiss-principle/).
