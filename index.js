/**
 * Безопасный ASCII-алфавит (89 символов).
 * Исключены кавычки, запятые и слеши, чтобы строка не ломалась при копировании или JSON-парсинге.
 */
const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+-./:;<=>?@[]^_{|}~";
const BASE = BigInt(ALPHABET.length);

// Мемоизация для ускорения расчёта биномиальных коэффициентов C(n, k)
const memo = new Map();

function C(n, k) {
  if (k < 0n || k > n) return 0n;
  if (k === 0n || k === n) return 1n;
  if (k * 2n > n) k = n - k; // Оптимизация симметрии: C(n, k) = C(n, n - k)

  // Уникальный ключ. Поскольку n <= 1300, 16 бит достаточно
  const key = (n << 16n) | k;
  if (memo.has(key)) return memo.get(key);

  let res = 1n;
  for (let i = 1n; i <= k; i++) {
    res = (res * (n - i + 1n)) / i;
  }
  memo.set(key, res);
  return res;
}

/**
 * Сериализация множества в максимально компактную ASCII строку
 */
function serialize(arr) {
  if (arr.length === 0) return "";

  // Копируем и сортируем массив (порядок не важен, но нужен для комбинадики)
  const sorted = [...arr].sort((a, b) => a - b);
  let I = 0n;

  for (let k = 0; k < sorted.length; k++) {
    // I += C(A[k] + k - 1, k + 1)
    I += C(BigInt(sorted[k] + k - 1), BigInt(k + 1));
  }

  // Сохраняем длину исходного массива в младших разрядах (т.к. N <= 1000, берем модуль 1001)
  let val = I * 1001n + BigInt(sorted.length);

  // Перевод числа в систему счисления по основанию 89
  if (val === 0n) return ALPHABET[0];
  let res = "";
  while (val > 0n) {
    res += ALPHABET[Number(val % BASE)];
    val /= BASE;
  }
  return res;
}

/**
 * Десериализация строки обратно в массив чисел
 */
function deserialize(str) {
  if (!str) return [];

  let val = 0n;
  let mult = 1n;

  for (let i = 0; i < str.length; i++) {
    val += BigInt(ALPHABET.indexOf(str[i])) * mult;
    mult *= BASE;
  }

  const N = Number(val % 1001n);
  let I = val / 1001n;

  const arr = new Array(N);

  for (let k = N - 1; k >= 0; k--) {
    let left = k;
    let right = 300 + k; // Максимально возможное значение v
    let bestV = k;

    // Бинарный поиск наибольшего v, для которого C(v, k+1) <= I
    while (left <= right) {
      let mid = Math.floor((left + right) / 2);
      if (C(BigInt(mid), BigInt(k + 1)) <= I) {
        bestV = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    I -= C(BigInt(bestV), BigInt(k + 1));
    arr[k] = bestV - k + 1;
  }

  return arr; // Возвращаем восстановленный массив
}

function runTests() {
  const generateRandom = (len, max, min = 1) =>
    Array.from(
      { length: len },
      () => Math.floor(Math.random() * (max - min + 1)) + min,
    );

  // Подготовка тестовых данных
  const testCases = [
    { name: "Простейшие короткие (5 чисел)", data: [1, 5, 20, 150, 300] },
    {
      name: "Случайные (50 чисел, от 1 до 300)",
      data: generateRandom(50, 300),
    },
    {
      name: "Случайные (100 чисел, от 1 до 300)",
      data: generateRandom(100, 300),
    },
    {
      name: "Случайные (500 чисел, от 1 до 300)",
      data: generateRandom(500, 300),
    },
    {
      name: "Случайные (1000 чисел, от 1 до 300)",
      data: generateRandom(1000, 300),
    },
    {
      name: "Граничные: все 1-значные (100 чисел)",
      data: generateRandom(100, 9),
    },
    {
      name: "Граничные: все 2-значные (100 чисел)",
      data: generateRandom(100, 99, 10),
    },
    {
      name: "Граничные: все 3-значные (100 чисел)",
      data: generateRandom(100, 300, 100),
    },
    {
      name: "Граничные: каждого числа по 3 (всего 900)",
      data: Array.from({ length: 900 }, (_, i) => Math.floor(i / 3) + 1),
    },
  ];

  console.log(String().padEnd(95, "-"));
  console.log(
    `| ${"Название теста".padEnd(40)} | ${"Наив. дл.".padEnd(9)} | ${"Сжат. дл.".padEnd(9)} | ${"Коэфф.".padEnd(8)} | ${"Успех".padEnd(5)} |`,
  );
  console.log(String().padEnd(95, "-"));

  testCases.forEach((tc) => {
    // Наивная сериализация для сравнения (т.к. порядок не важен, сортируем для честности, хотя на длину это не влияет)
    const naiveStr = tc.data.join(",");
    const naiveLen = naiveStr.length;

    // Наша сериализация
    const compressedStr = serialize(tc.data);
    const compressedLen = compressedStr.length;

    // Проверка корректности (десериализация и сравнение)
    const decompressed = deserialize(compressedStr);
    // Сверяем отсортированные массивы
    const isCorrect =
      [...tc.data].sort((a, b) => a - b).join(",") === decompressed.join(",");

    const ratio = (naiveLen / compressedLen).toFixed(1) + "x";

    console.log(
      `| ${tc.name.padEnd(40)} | ${String(naiveLen).padEnd(9)} | ${String(compressedLen).padEnd(9)} | ${ratio.padEnd(8)} | ${isCorrect ? "Да   " : "Нет  "} |`,
    );
  });
  console.log(String().padEnd(95, "-"));
}

runTests();
