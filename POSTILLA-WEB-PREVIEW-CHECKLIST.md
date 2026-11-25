# Postilla Web — checklist di collaudo della preview

**Regola di compilazione:** per ogni voce seleziona OK o KO e aggiungi una nota. Lascia entrambe vuote se non hai ancora provato. Non considerare un punto risolto solo perché la CI è verde.

Legenda: `[ ] OK` = comportamento corretto · `[ ] KO` = problema osservato.

## 1. Accesso, identità e vault

- [x] OK  [ ] KO — Accesso con estensione NIP-07; chiave privata non richiesta alla pagina.
  Commento: non è persistente
- [x] OK  [ ] KO — Accesso con Amber/Bunker NIP-46.
  Commento: non è persistente e al successivo login non va
- [ ] OK  [ ] KO — Accesso watch-only con npub e navigazione senza possibilità di firmare.
  Commento:
- [ ] OK  [ ] KO — Accesso con mnemonic o nsec; logout cancella il signer in memoria.
  Commento:
- [ ] OK  [ ] KO — Creazione nuova identità e schermata obbligatoria per il backup della frase.
  Commento:
- [ ] OK  [ ] KO — Esportazione NIP-49 e salvataggio nel vault cifrato.
  Commento:
- [ ] OK  [ ] KO — Chiusura/riapertura: vault sbloccabile con passphrase corretta; passphrase errata rifiutata.
  Commento:

## 2. Relay e broadcast delle preferenze

- [x] OK  [ ] KO — La lista NIP-65 ricevuta (kind 10002) sostituisce i relay predefiniti; marker read/write rispettati.
  Commento:
- [ ] OK  [ ] KO — In assenza di un broadcast personale restano disponibili i relay proposti inizialmente.
  Commento:
- [ ] OK  [ ] KO — Posso aggiungere/rimuovere relay e impostare separatamente Read e Write.
  Commento:
- [ ] OK  [ ] KO — I relay DM kind 10050 vengono caricati e visualizzati separatamente.
  Commento:
- [ ] OK  [ ] KO — I server Blossom kind 10063 vengono caricati nella sezione Blossom, senza essere trattati come relay Nostr.
  Commento:
- [ ] OK  [ ] KO — I relay Search kind 10007 vengono caricati e usati dalla ricerca.
  Commento:
- [ ] OK  [ ] KO — “Broadcast Nostr lists” pubblica kind 10002, 10050, 10063 e 10007 sui relay Nostr Read/Write selezionati e mostra le conferme per ogni lista.
  Commento:
- [ ] OK  [ ] KO — Un successivo riavvio conserva le liste ricevute e le selezioni locali.
  Commento:

## 3. Feed, rete e ricerca

- [ ] OK  [ ] KO — For You recupera eventi dai relay previsti.
  Commento:
- [ ] OK  [ ] KO — Trending mostra risultati e filtri All, Posts, Images, Videos e Articles.
  Commento:
- [ ] OK  [ ] KO — Postilla mostra il feed dedicato.
  Commento:
- [ ] OK  [ ] KO — Follows non mostra autori che non seguo.
  Commento:
- [ ] OK  [ ] KO — Extended recupera la rete a due salti e rispetta il filtro autori.
  Commento:
- [ ] OK  [ ] KO — Ricerca per testo e hashtag interroga i relay Search/Read selezionati.
  Commento:
- [ ] OK  [ ] KO — Ricerca/apertura di note, profili e coordinate naddr.
  Commento:
- [ ] OK  [ ] KO — Moderazione: utenti e hashtag silenziati non ricompaiono nei risultati.
  Commento:

## 4. Messaggi privati NIP-17 e traduzione

- [ ] OK  [ ] KO — Ricezione DM dai relay presenti nella propria lista kind 10050.
  Commento:
- [ ] OK  [ ] KO — Con destinatario che ha pubblicato kind 10050, l'invio avviene solo sui relay dichiarati dal destinatario.
  Commento:
- [ ] OK  [ ] KO — Con destinatario senza kind 10050, Postilla blocca l'invio e spiega il motivo; nessun fallback sui relay generici.
  Commento:
- [ ] OK  [ ] KO — Se nessun relay destinatario conferma con OK, il messaggio non viene inserito localmente come inviato.
  Commento:
- [ ] OK  [ ] KO — Il pulsante Translate appare nella bolla e consente di alternare traduzione e originale.
  Commento:
- [ ] OK  [ ] KO — Link, hashtag e riferimenti Nostr restano intatti dopo la traduzione.
  Commento:
- [ ] OK  [ ] KO — La chiave DeepL resta nella sessione e viene rimossa quando termina la sessione.
  Commento:
- [ ] OK  [ ] KO — La traduzione reale funziona con proxy DeepL installato e variabile `POSTILLA_TRANSLATION_API` configurata.
  Commento:

## 5. Lightning NWC — NIP-47

- [ ] OK  [ ] KO — URI NWC valido utilizzabile per la sessione senza essere persistito in chiaro.
  Commento:
- [ ] OK  [ ] KO — URI NWC cifrato con passphrase separata e salvato come ciphertext.
  Commento:
- [ ] OK  [ ] KO — Dopo reload, il wallet resta bloccato fino alla passphrase corretta.
  Commento:
- [ ] OK  [ ] KO — Passphrase errata rifiutata; eliminazione della copia cifrata funzionante.
  Commento:
- [ ] OK  [ ] KO — Zap con NWC, WebLN e QR invoice secondo il metodo disponibile.
  Commento:

## 6. Spark — backup e ripristino NIP-78

- [ ] OK  [ ] KO — Con la stessa identità Nostr di Android, Web trova il backup Spark pubblicato da Android.
  Commento:
- [ ] OK  [ ] KO — Web decifra e ripristina il wallet corretto tramite Breez Spark SDK.
  Commento:
- [ ] OK  [ ] KO — Web pubblica un backup aggiornato sui propri relay Write.
  Commento:
- [ ] OK  [ ] KO — Android trova e ripristina il backup generato da Web.
  Commento:
- [ ] OK  [ ] KO — La cancellazione riguarda soltanto il backup del wallet attivo.
  Commento:
- [ ] OK  [ ] KO — Dopo refresh la frase non resta in localStorage/sessionStorage; il recupero si avvia manualmente.
  Commento:

## 7. Marketplace NIP-99

- [ ] OK  [ ] KO — Lettura degli annunci kind 30402 dai relay Marketplace e personali.
  Commento:
- [ ] OK  [ ] KO — Creazione annuncio con titolo, descrizione, prezzo, categoria, disponibilità e posizione.
  Commento:
- [ ] OK  [ ] KO — Upload di immagini ai server Blossom selezionati e pubblicazione di tag image/imeta.
  Commento:
- [ ] OK  [ ] KO — Ricerca e filtri per categoria, località, autore e stato.
  Commento:
- [ ] OK  [ ] KO — Wishlist NIP-51: aggiunta, rimozione e persistenza dopo riavvio.
  Commento:
- [ ] OK  [ ] KO — Filtro “My Wishlist” mostra soltanto gli annunci salvati.
  Commento:
- [ ] OK  [ ] KO — Interesse: un solo autore conta una volta anche se pubblica reazioni duplicate.
  Commento:
- [ ] OK  [ ] KO — Unlike rimuove le reazioni conosciute dell'utente e aggiorna il conteggio.
  Commento:
- [ ] OK  [ ] KO — Venditore può marcare l'annuncio come venduto.
  Commento:
- [ ] OK  [ ] KO — Solo il venditore può ritirare il proprio annuncio tramite NIP-09; l'annuncio non appare più dopo il refresh.
  Commento:
- [ ] OK  [ ] KO — “Contact seller” apre la conversazione DM con il venditore.
  Commento:

## 8. Video NIP-71

- [ ] OK  [ ] KO — Scoperta e riproduzione dei video kind 21, 22, 34235 e 34236.
  Commento:
- [ ] OK  [ ] KO — Upload video su Blossom entro il limite attuale di 10 MB.
  Commento:
- [ ] OK  [ ] KO — Pubblicazione orizzontale kind 34235 e verticale kind 34236.
  Commento:
- [ ] OK  [ ] KO — Evento pubblicato contiene titolo, published_at e NIP-92 imeta coerente con il file caricato.
  Commento:
- [ ] OK  [ ] KO — Se l'upload riesce ma nessun relay conferma l'evento Nostr, l'interfaccia segnala il fallimento di pubblicazione.
  Commento:

## 9. Articoli NIP-23

- [ ] OK  [ ] KO — Lettura degli articoli kind 30023 dai relay Read/Search.
  Commento:
- [ ] OK  [ ] KO — Visualizzazione titolo, summary, data e topic.
  Commento:
- [ ] OK  [ ] KO — Pubblicazione di un nuovo articolo Markdown kind 30023 con d, title e published_at.
  Commento:
- [ ] OK  [ ] KO — L'ultima revisione per autore + d è quella mostrata.
  Commento:
- [ ] OK  [ ] KO — Il contenuto Markdown è mostrato come testo sicuro; non viene eseguito HTML.
  Commento:

## 10. Interfaccia, impostazioni e dispositivi

- [ ] OK  [ ] KO — Tema chiaro/scuro.
  Commento:
- [ ] OK  [ ] KO — Selettore lingua inglese/italiano: navigazione e tab feed cambiano lingua.
  Commento:
- [ ] OK  [ ] KO — Layout usabile su smartphone e desktop, senza sovrapposizioni o contenuti tagliati.
  Commento:
- [ ] OK  [ ] KO — Search, Marketplace, Video, Articles, Settings e Spark raggiungibili dal menu.
  Commento:
- [ ] OK  [ ] KO — Nessun errore runtime evidente in console durante l'uso delle schermate principali.
  Commento:

## 11. Esito complessivo

- [ ] OK — Accetto questa preview per il passaggio successivo.
- [ ] KO — La preview richiede correzioni prima dell'accettazione.

**Commenti generali / priorità:**

