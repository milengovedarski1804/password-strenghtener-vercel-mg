# Източници на референтните данни

Този документ описва произхода на всеки файл в `packages/core/data/`,
използван от детекторите в `packages/core` (виж `src/wordlists.ts`).

## `common-passwords-top10k.json` — 10 000 записа

- **Източник:** SecLists, файл `Passwords/Common-Credentials/10k-most-common.txt`
- **Автор/поддържащ:** Daniel Miessler ([@danielmiessler](https://github.com/danielmiessler))
- **Линк:** https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/10k-most-common.txt
- **Лиценз:** MIT License

## `common-words-en.json` — 5459 записа

- **Източник:** repo `first20hours/google-10000-english`, файл
  `google-10000-english-usa-no-swears-medium.txt`
- **Автори:** Josh Kaufman (компилация/почистване), базирано на Google Web
  Trillion Word Corpus, разпространяван от Linguistic Data Consortium (LDC);
  подмножество от Peter Norvig
- **Линк:** https://github.com/first20hours/google-10000-english
- **Лиценз:** Данните са позволени за **образователна и лична/научна
  употреба** по лиценза на LDC и MIT лиценза на Norvig за неговия принос,
  както и по доктрината US fair use. **Комерсиална употреба изисква
  отделно лицензиране от Linguistic Data Consortium** и не се препоръчва
  без такова.

## `common-names.json` — 10 735 записа

- **Източник:** SecLists, файл `Usernames/Names/names.txt`
- **Автор/поддържащ:** Daniel Miessler ([@danielmiessler](https://github.com/danielmiessler))
- **Линк:** https://github.com/danielmiessler/SecLists/blob/master/Usernames/Names/names.txt
- **Лиценз:** MIT License

## `common-words-bg.json` — 205 записа

Съставен ръчно от автора на проекта — курирана листа от чести български
думи и имена, използвани в пароли. Не произлиза от външен източник,
поради липса на леснодостъпен свободен български wordlist, сравним по
мащаб с английските еквиваленти.
