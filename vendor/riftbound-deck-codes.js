"use strict";
var RiftyDeckCodes = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // ../../../../../../private/tmp/el-rifty-deckcodes.VCWwAC/package/dist/mappings.js
  var require_mappings = __commonJS({
    "../../../../../../private/tmp/el-rifty-deckcodes.VCWwAC/package/dist/mappings.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.VARIANT_MAP = exports.SET_MAP = void 0;
      exports.SET_MAP = {
        OGN: 0,
        OGS: 1,
        ARC: 2,
        SFD: 3,
        UNL: 4,
        VEN: 5,
        RAD: 6
      };
      exports.VARIANT_MAP = {
        "": 0,
        // Base variant (no suffix)
        a: 1,
        s: 2,
        "*": 2,
        // Alternative signed notation
        b: 3
      };
    }
  });

  // ../../../../../../private/tmp/el-rifty-deckcodes.VCWwAC/package/dist/VarintTranslator.js
  var require_VarintTranslator = __commonJS({
    "../../../../../../private/tmp/el-rifty-deckcodes.VCWwAC/package/dist/VarintTranslator.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var VarintTranslator = class _VarintTranslator {
        constructor(_bytes) {
          this.bytes = new Uint8Array(_bytes);
        }
        get length() {
          return this.bytes.length;
        }
        /**
         * Reads and removes a varint from the beginning of the byte array
         * @returns The decoded integer value
         * @throws Error if no bytes available or invalid varint format
         */
        PopVarint() {
          if (this.bytes.length === 0) {
            throw new Error("No bytes available to read varint");
          }
          let result = 0;
          let currentShift = 0;
          let bytesPopped = 0;
          for (let i = 0; i < this.bytes.length; i++) {
            bytesPopped++;
            const current = this.bytes[i] & _VarintTranslator.AllButMSB;
            result |= current << currentShift;
            if ((this.bytes[i] & _VarintTranslator.JustMSB) !== _VarintTranslator.JustMSB) {
              this.bytes = this.bytes.slice(bytesPopped);
              return result;
            }
            currentShift += 7;
          }
          throw new Error("Byte array did not contain valid varints.");
        }
        /**
         * Slices the internal byte array
         * @param begin - Start index
         * @param end - Optional end index
         */
        sliceAndSet(begin, end) {
          this.bytes = this.bytes.slice(begin, end);
        }
        /**
         * Gets a byte at the specified index
         * @param index - Index to retrieve
         * @returns The byte value at the index
         * @throws Error if index is out of bounds
         */
        get(index) {
          if (index < 0 || index >= this.bytes.length) {
            throw new Error(`Index out of bounds: ${index}`);
          }
          return this.bytes[index];
        }
        /**
         * Converts a number into its varint byte representation
         * @param value - The number to encode
         * @returns Uint8Array containing the varint encoding
         */
        static GetVarint(value) {
          const buff = new Uint8Array(10);
          let currentIndex = 0;
          if (value === 0)
            return new Uint8Array([0]);
          while (value !== 0) {
            let byteVal = value & this.AllButMSB;
            value >>>= 7;
            if (value !== 0)
              byteVal |= this.JustMSB;
            buff[currentIndex++] = byteVal;
          }
          return buff.slice(0, currentIndex);
        }
      };
      VarintTranslator.AllButMSB = 127;
      VarintTranslator.JustMSB = 128;
      exports.default = VarintTranslator;
    }
  });

  // ../../../../../../private/tmp/el-rifty-deckcodes.VCWwAC/package/dist/deckCode.js
  var require_deckCode = __commonJS({
    "../../../../../../private/tmp/el-rifty-deckcodes.VCWwAC/package/dist/deckCode.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.getCodeFromDeck = getCodeFromDeck;
      exports.getDeckFromCode = getDeckFromCode;
      var mappings_1 = require_mappings();
      var VarintTranslator_1 = __importDefault(require_VarintTranslator());
      var FORMAT = 1;
      var VERSION = 5;
      var BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
      function base32Encode(bytes) {
        let result = "";
        let buffer = 0;
        let bitsLeft = 0;
        for (const byte of bytes) {
          buffer = buffer << 8 | byte;
          bitsLeft += 8;
          while (bitsLeft >= 5) {
            bitsLeft -= 5;
            result += BASE32_ALPHABET[buffer >> bitsLeft & 31];
          }
        }
        if (bitsLeft > 0) {
          buffer <<= 5 - bitsLeft;
          result += BASE32_ALPHABET[buffer & 31];
        }
        return result;
      }
      function base32Decode(str) {
        const bytes = [];
        let buffer = 0;
        let bitsLeft = 0;
        for (const char of str) {
          const value = BASE32_ALPHABET.indexOf(char.toUpperCase());
          if (value === -1) {
            throw new Error(`Invalid character in deck code: '${char}'`);
          }
          buffer = buffer << 5 | value;
          bitsLeft += 5;
          while (bitsLeft >= 8) {
            bitsLeft -= 8;
            bytes.push(buffer >> bitsLeft & 255);
          }
        }
        return new Uint8Array(bytes);
      }
      function parseCardCode(cardCode) {
        const parts = cardCode.split("-");
        if (parts.length !== 2) {
          throw new Error(`Invalid card code format: ${cardCode}. Expected format: SET-NUMBERvariant`);
        }
        const set = parts[0];
        const rest = parts[1];
        if (!set || !rest) {
          throw new Error(`Invalid card code format: ${cardCode}. Missing set or card number.`);
        }
        const match = rest.match(/^((?:R|SP)?\d+)([a-z*]?)$/);
        if (!match) {
          throw new Error(`Invalid card code format: ${cardCode}. Expected format: SET-NUMBERvariant`);
        }
        return {
          set,
          number: match[1] ?? "",
          variant: match[2] ?? ""
        };
      }
      function groupBySetAndVariant(cards) {
        const groups = /* @__PURE__ */ new Map();
        for (const card of cards) {
          const { set, number, variant } = parseCardCode(card.cardCode);
          const key = `${set}-${variant}`;
          if (!groups.has(key)) {
            const setValue = mappings_1.SET_MAP[set];
            if (setValue === void 0) {
              throw new Error(`Unknown set: ${set}. Valid sets: ${Object.keys(mappings_1.SET_MAP).join(", ")}`);
            }
            const variantValue = mappings_1.VARIANT_MAP[variant];
            if (variantValue === void 0) {
              throw new Error(`Unknown variant: '${variant}'. Valid variants: ${Object.keys(mappings_1.VARIANT_MAP).join(", ")}`);
            }
            groups.set(key, {
              set: setValue,
              variant: variantValue,
              cardNumbers: []
            });
          }
          groups.get(key).cardNumbers.push(number);
        }
        return Array.from(groups.values()).sort((a, b) => {
          if (a.set !== b.set)
            return a.set - b.set;
          if (a.variant !== b.variant)
            return a.variant - b.variant;
          return 0;
        }).map((group) => ({
          ...group,
          cardNumbers: group.cardNumbers.sort((a, b) => a.localeCompare(b, void 0, { numeric: true }))
        }));
      }
      function encodeDeckSection(deck, maxCount = 12, version = 4) {
        const bytes = [];
        for (let count = maxCount; count >= 1; count--) {
          const cards = deck.filter((card) => card.count === count);
          const setVariantGroups = groupBySetAndVariant(cards);
          bytes.push(...VarintTranslator_1.default.GetVarint(setVariantGroups.length));
          for (const group of setVariantGroups) {
            bytes.push(...VarintTranslator_1.default.GetVarint(group.cardNumbers.length));
            bytes.push(group.set);
            bytes.push(group.variant);
            for (const cardNumber of group.cardNumbers) {
              if (version >= 4) {
                if (cardNumber.startsWith("R")) {
                  bytes.push(1);
                  bytes.push(...VarintTranslator_1.default.GetVarint(parseInt(cardNumber.slice(1))));
                } else {
                  bytes.push(0);
                  bytes.push(...VarintTranslator_1.default.GetVarint(parseInt(cardNumber)));
                }
              } else {
                bytes.push(...VarintTranslator_1.default.GetVarint(parseInt(cardNumber)));
              }
            }
          }
        }
        return bytes;
      }
      function decodeDeckSection(translator, maxCount = 12, signedSuffix = "s", version = 4) {
        const deck = [];
        for (let count = maxCount; count >= 1; count--) {
          const numGroups = translator.PopVarint();
          for (let i = 0; i < numGroups; i++) {
            const numCards = translator.PopVarint();
            const set = translator.get(0);
            const variant = translator.get(1);
            translator.sliceAndSet(2);
            const setCode = Object.entries(mappings_1.SET_MAP).find(([_, value]) => value === set)?.[0];
            let variantCode;
            if (variant === 2) {
              variantCode = signedSuffix;
            } else {
              variantCode = Object.entries(mappings_1.VARIANT_MAP).find(([_, value]) => value === variant)?.[0];
            }
            if (!setCode) {
              throw new Error(`Unknown set code: ${set}`);
            }
            for (let j = 0; j < numCards; j++) {
              let cardNumberStr;
              if (version >= 4) {
                const isRune = translator.get(0);
                translator.sliceAndSet(1);
                const num = translator.PopVarint();
                if (isRune === 1) {
                  cardNumberStr = `R${num.toString().padStart(2, "0")}`;
                } else {
                  cardNumberStr = num.toString().padStart(3, "0");
                }
              } else {
                const num = translator.PopVarint();
                cardNumberStr = num.toString().padStart(3, "0");
              }
              deck.push({
                cardCode: `${setCode}-${cardNumberStr}${variantCode || ""}`,
                count
              });
            }
          }
        }
        return deck;
      }
      function encodeDeckSectionSparse(deck, flagged) {
        const bytes = [];
        const counts = Array.from(new Set(deck.filter((card) => card.count >= 1).map((card) => card.count))).sort((a, b) => b - a);
        bytes.push(...VarintTranslator_1.default.GetVarint(counts.length));
        for (const count of counts) {
          bytes.push(...VarintTranslator_1.default.GetVarint(count));
          const cards = deck.filter((card) => card.count === count);
          const setVariantGroups = groupBySetAndVariant(cards);
          bytes.push(...VarintTranslator_1.default.GetVarint(setVariantGroups.length));
          for (const group of setVariantGroups) {
            bytes.push(...VarintTranslator_1.default.GetVarint(group.cardNumbers.length));
            bytes.push(group.set);
            bytes.push(group.variant);
            for (const cardNumber of group.cardNumbers) {
              if (!flagged) {
                bytes.push(...VarintTranslator_1.default.GetVarint(parseInt(cardNumber)));
              } else if (cardNumber.startsWith("SP")) {
                bytes.push(2);
                bytes.push(...VarintTranslator_1.default.GetVarint(parseInt(cardNumber.slice(2))));
              } else if (cardNumber.startsWith("R")) {
                bytes.push(1);
                bytes.push(...VarintTranslator_1.default.GetVarint(parseInt(cardNumber.slice(1))));
              } else {
                bytes.push(0);
                bytes.push(...VarintTranslator_1.default.GetVarint(parseInt(cardNumber)));
              }
            }
          }
        }
        return bytes;
      }
      function decodeDeckSectionSparse(translator, signedSuffix = "s", flagged = true) {
        const deck = [];
        const numCounts = translator.PopVarint();
        for (let i = 0; i < numCounts; i++) {
          const count = translator.PopVarint();
          const numGroups = translator.PopVarint();
          for (let g = 0; g < numGroups; g++) {
            const numCards = translator.PopVarint();
            const set = translator.get(0);
            const variant = translator.get(1);
            translator.sliceAndSet(2);
            const setCode = Object.entries(mappings_1.SET_MAP).find(([_, value]) => value === set)?.[0];
            let variantCode;
            if (variant === 2) {
              variantCode = signedSuffix;
            } else {
              variantCode = Object.entries(mappings_1.VARIANT_MAP).find(([_, value]) => value === variant)?.[0];
            }
            if (!setCode) {
              throw new Error(`Unknown set code: ${set}`);
            }
            for (let j = 0; j < numCards; j++) {
              let cardNumberStr;
              if (!flagged) {
                const num2 = translator.PopVarint();
                cardNumberStr = num2.toString().padStart(3, "0");
                deck.push({
                  cardCode: `${setCode}-${cardNumberStr}${variantCode || ""}`,
                  count
                });
                continue;
              }
              const prefixFlag = translator.get(0);
              translator.sliceAndSet(1);
              const num = translator.PopVarint();
              if (prefixFlag === 2) {
                cardNumberStr = `SP${num}`;
              } else if (prefixFlag === 1) {
                cardNumberStr = `R${num.toString().padStart(2, "0")}`;
              } else if (prefixFlag === 0) {
                cardNumberStr = num.toString().padStart(3, "0");
              } else {
                throw new Error(`Unknown number-prefix flag: ${prefixFlag}`);
              }
              deck.push({
                cardCode: `${setCode}-${cardNumberStr}${variantCode || ""}`,
                count
              });
            }
          }
        }
        return deck;
      }
      function getCodeFromDeck(mainDeck, sideboard = [], chosenChampion) {
        for (const card of [...mainDeck, ...sideboard]) {
          if (!Number.isSafeInteger(card.count) || card.count < 1) {
            throw new Error(`Invalid card count for ${card.cardCode}: ${card.count}. Count must be a positive integer.`);
          }
        }
        const hasRuneCode = (code) => {
          const { number } = parseCardCode(code);
          return number.startsWith("R");
        };
        const hasSpecialCode = (code) => {
          const { number } = parseCardCode(code);
          return number.startsWith("SP");
        };
        const needsV4 = mainDeck.some((c) => hasRuneCode(c.cardCode)) || sideboard.some((c) => hasRuneCode(c.cardCode)) || chosenChampion !== void 0 && hasRuneCode(chosenChampion);
        const maxMain = mainDeck.reduce((m, c) => Math.max(m, c.count), 0);
        const maxSide = sideboard.reduce((m, c) => Math.max(m, c.count), 0);
        const needsV5 = maxMain > 12 || maxSide > 3;
        const anySpecial = mainDeck.some((c) => hasSpecialCode(c.cardCode)) || sideboard.some((c) => hasSpecialCode(c.cardCode)) || chosenChampion !== void 0 && hasSpecialCode(chosenChampion);
        const version = needsV5 || anySpecial ? 5 : needsV4 ? 4 : 3;
        const flagged = needsV4 || anySpecial;
        const bytes = [];
        bytes.push(FORMAT << 4 | version);
        if (version >= 5) {
          bytes.push(flagged ? 1 : 0);
          bytes.push(...encodeDeckSectionSparse(mainDeck, flagged));
          bytes.push(...encodeDeckSectionSparse(sideboard, flagged));
        } else {
          bytes.push(...encodeDeckSection(mainDeck, 12, version));
          bytes.push(...encodeDeckSection(sideboard, 3, version));
        }
        if (chosenChampion) {
          const { set, number, variant } = parseCardCode(chosenChampion);
          const setValue = mappings_1.SET_MAP[set];
          if (setValue === void 0) {
            throw new Error(`Unknown set in chosen champion: ${set}. Valid sets: ${Object.keys(mappings_1.SET_MAP).join(", ")}`);
          }
          const variantValue = mappings_1.VARIANT_MAP[variant];
          if (variantValue === void 0) {
            throw new Error(`Unknown variant in chosen champion: '${variant}'. Valid variants: ${Object.keys(mappings_1.VARIANT_MAP).join(", ")}`);
          }
          bytes.push(1);
          bytes.push(setValue);
          bytes.push(variantValue);
          if (flagged && number.startsWith("SP")) {
            bytes.push(2);
            bytes.push(...VarintTranslator_1.default.GetVarint(parseInt(number.slice(2))));
          } else if (flagged && number.startsWith("R")) {
            bytes.push(1);
            bytes.push(...VarintTranslator_1.default.GetVarint(parseInt(number.slice(1))));
          } else if (flagged) {
            bytes.push(0);
            bytes.push(...VarintTranslator_1.default.GetVarint(parseInt(number)));
          } else {
            bytes.push(...VarintTranslator_1.default.GetVarint(parseInt(number)));
          }
        } else {
          bytes.push(0);
        }
        return base32Encode(new Uint8Array(bytes));
      }
      function getDeckFromCode(code, options) {
        const signedSuffix = options?.signedSuffix ?? "s";
        const bytes = base32Decode(code);
        const translator = new VarintTranslator_1.default(bytes);
        const formatVersion = translator.get(0);
        translator.sliceAndSet(1);
        const format = formatVersion >> 4 & 15;
        const version = formatVersion & 15;
        if (format !== FORMAT) {
          throw new Error(`Unsupported format: ${format}. Expected format: ${FORMAT}`);
        }
        if (version > VERSION) {
          throw new Error(`Unsupported version: ${version}. Maximum supported version: ${VERSION}`);
        }
        let flagged;
        if (version >= 5) {
          const prefixFlag = translator.get(0);
          translator.sliceAndSet(1);
          if (prefixFlag > 1) {
            throw new Error(`Unsupported deck prefix flag: ${prefixFlag}`);
          }
          flagged = prefixFlag === 1;
        } else {
          flagged = version >= 4;
        }
        let mainDeck;
        let sideboard = [];
        if (version >= 5) {
          mainDeck = decodeDeckSectionSparse(translator, signedSuffix, flagged);
          sideboard = decodeDeckSectionSparse(translator, signedSuffix, flagged);
        } else {
          mainDeck = decodeDeckSection(translator, 12, signedSuffix, version);
          if (version >= 2) {
            sideboard = decodeDeckSection(translator, 3, signedSuffix, version);
          }
        }
        let chosenChampion;
        if (version >= 3) {
          const hasChampion = translator.get(0);
          translator.sliceAndSet(1);
          if (hasChampion === 1) {
            const set = translator.get(0);
            const variant = translator.get(1);
            translator.sliceAndSet(2);
            let cardNumberStr;
            if (flagged) {
              const prefixFlag = translator.get(0);
              translator.sliceAndSet(1);
              const num = translator.PopVarint();
              if (prefixFlag === 2) {
                cardNumberStr = `SP${num}`;
              } else if (prefixFlag === 1) {
                cardNumberStr = `R${num.toString().padStart(2, "0")}`;
              } else if (prefixFlag === 0) {
                cardNumberStr = num.toString().padStart(3, "0");
              } else {
                throw new Error(`Unknown number-prefix flag in champion: ${prefixFlag}`);
              }
            } else {
              const num = translator.PopVarint();
              cardNumberStr = num.toString().padStart(3, "0");
            }
            const setCode = Object.entries(mappings_1.SET_MAP).find(([_, value]) => value === set)?.[0];
            if (!setCode) {
              throw new Error(`Unknown set code in champion: ${set}`);
            }
            let variantCode;
            if (variant === 2) {
              variantCode = signedSuffix;
            } else {
              variantCode = Object.entries(mappings_1.VARIANT_MAP).find(([_, value]) => value === variant)?.[0];
            }
            chosenChampion = `${setCode}-${cardNumberStr}${variantCode || ""}`;
          }
        }
        return {
          mainDeck,
          sideboard,
          chosenChampion
        };
      }
    }
  });

  // ../../../../../../private/tmp/el-rifty-deckcodes.VCWwAC/package/dist/index.js
  var require_index = __commonJS({
    "../../../../../../private/tmp/el-rifty-deckcodes.VCWwAC/package/dist/index.js"(exports) {
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.VarintTranslator = exports.VARIANT_MAP = exports.SET_MAP = exports.getDeckFromCode = exports.getCodeFromDeck = void 0;
      var deckCode_1 = require_deckCode();
      Object.defineProperty(exports, "getCodeFromDeck", { enumerable: true, get: function() {
        return deckCode_1.getCodeFromDeck;
      } });
      Object.defineProperty(exports, "getDeckFromCode", { enumerable: true, get: function() {
        return deckCode_1.getDeckFromCode;
      } });
      var mappings_1 = require_mappings();
      Object.defineProperty(exports, "SET_MAP", { enumerable: true, get: function() {
        return mappings_1.SET_MAP;
      } });
      Object.defineProperty(exports, "VARIANT_MAP", { enumerable: true, get: function() {
        return mappings_1.VARIANT_MAP;
      } });
      var VarintTranslator_1 = require_VarintTranslator();
      Object.defineProperty(exports, "VarintTranslator", { enumerable: true, get: function() {
        return __importDefault(VarintTranslator_1).default;
      } });
    }
  });
  return require_index();
})();
