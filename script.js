const taxFreeStates = {
  AK: { name: "Alaska", zips: ["99501", "99503", "99654", "99701", "99801"] },
  DE: { name: "Delaware", zips: ["19702", "19711", "19801", "19901", "19904"] },
  MT: { name: "Montana", zips: ["59101", "59401", "59715", "59801", "59901"] },
  NH: { name: "New Hampshire", zips: ["03060", "03101", "03301", "03820", "03801"] },
  OR: { name: "Oregon", zips: ["97035", "97201", "97301", "97401", "97701"] },
};
const openAddressSamples = {
  AK: [
    { street: "3501 Denali St", city: "Anchorage", zip: "99503" },
    { street: "246 Main St", city: "Juneau", zip: "99801" },
    { street: "705 Cushman St", city: "Fairbanks", zip: "99701" },
  ],
  DE: [
    { street: "1201 N Market St", city: "Wilmington", zip: "19801" },
    { street: "9 E Loockerman St", city: "Dover", zip: "19901" },
    { street: "72 E Main St", city: "Newark", zip: "19711" },
  ],
  MT: [
    { street: "27 N 27th St", city: "Billings", zip: "59101" },
    { street: "101 E Front St", city: "Missoula", zip: "59801" },
    { street: "7 W Main St", city: "Bozeman", zip: "59715" },
  ],
  NH: [
    { street: "1 City Hall Plz", city: "Manchester", zip: "03101" },
    { street: "229 Main St", city: "Nashua", zip: "03060" },
    { street: "41 Green St", city: "Concord", zip: "03301" },
  ],
  OR: [
    { street: "1120 SW 5th Ave", city: "Portland", zip: "97204" },
    { street: "555 Liberty St SE", city: "Salem", zip: "97301" },
    { street: "777 Pearl St", city: "Eugene", zip: "97401" },
  ],
};
const fallbackNames = [
  { firstName: "James", lastName: "Smith" },
  { firstName: "Mary", lastName: "Johnson" },
  { firstName: "Robert", lastName: "Williams" },
  { firstName: "Patricia", lastName: "Brown" },
  { firstName: "John", lastName: "Jones" },
];
const stateSelect = document.getElementById("state");
const sourceSelect = document.getElementById("source");
const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");
const message = document.getElementById("message");

const outputIds = {
  name: document.getElementById("name"),
  phone: document.getElementById("phone"),
  street: document.getElementById("street"),
  city: document.getElementById("city"),
  stateCode: document.getElementById("stateCode"),
  zip: document.getElementById("zip"),
  email: document.getElementById("email"),
};

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeFallbackPhone() {
  return `(${randomInt(201, 989)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`;
}

function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) {
    return makeFallbackPhone();
  }
  const local = digits.slice(-10);
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

async function fetchRandomUser() {
  try {
    const response = await fetch("https://randomuser.me/api/?nat=us&inc=name,phone,email");
    if (!response.ok) {
      throw new Error("randomuser api error");
    }
    const payload = await response.json();
    const person = payload?.results?.[0];
    if (!person) {
      throw new Error("randomuser empty");
    }
    return {
      firstName: person.name.first,
      lastName: person.name.last,
      phone: normalizePhone(person.phone || ""),
      email: String(person.email || "").toLowerCase(),
    };
  } catch {
    const person = pickRandom(fallbackNames);
    return {
      ...person,
      phone: makeFallbackPhone(),
      email: `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}${randomInt(10, 99)}@mail.com`,
    };
  }
}

async function fetchAddressFromZippopotam(stateCode) {
  const zip = pickRandom(taxFreeStates[stateCode].zips);
  const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
  if (!response.ok) {
    throw new Error("zippopotam api error");
  }
  const payload = await response.json();
  const place = payload?.places?.[0];
  if (!place) {
    throw new Error("zippopotam empty");
  }
  return {
    street: `${randomInt(100, 9999)} ${pickRandom(["Main St", "Oak Ave", "Maple Dr", "Pine Ln", "Cedar Ct"])}`,
    city: place["place name"],
    stateCode: place["state abbreviation"],
    zip: payload["post code"],
  };
}

function createAddressFromOpenAddresses(stateCode) {
  const item = pickRandom(openAddressSamples[stateCode]);
  return {
    street: item.street,
    city: item.city,
    stateCode,
    zip: item.zip,
  };
}

async function createAddress(stateCode, source) {
  const user = await fetchRandomUser();
  const address =
    source === "openaddresses"
      ? createAddressFromOpenAddresses(stateCode)
      : await fetchAddressFromZippopotam(stateCode);
  return {
    name: `${user.firstName} ${user.lastName}`,
    phone: user.phone,
    street: address.street,
    city: address.city,
    stateCode: address.stateCode,
    zip: address.zip,
    email: user.email,
  };
}

function renderAddress(data) {
  Object.entries(data).forEach(([key, value]) => {
    outputIds[key].textContent = value;
  });
}

function getOutputText() {
  return [
    `Name: ${outputIds.name.textContent}`,
    `Phone: ${outputIds.phone.textContent}`,
    `Street: ${outputIds.street.textContent}`,
    `City: ${outputIds.city.textContent}`,
    `State: ${outputIds.stateCode.textContent}`,
    `ZIP: ${outputIds.zip.textContent}`,
    `Email: ${outputIds.email.textContent}`,
  ].join("\n");
}

Object.entries(taxFreeStates).forEach(([code, { name }]) => {
  const option = document.createElement("option");
  option.value = code;
  option.textContent = `${code} - ${name}`;
  stateSelect.appendChild(option);
});

generateBtn.addEventListener("click", async () => {
  const stateCode = stateSelect.value;
  const source = sourceSelect.value;
  generateBtn.disabled = true;
  message.textContent = "生成中...";
  try {
    const result = await createAddress(stateCode, source);
    renderAddress(result);
    message.textContent =
      source === "openaddresses"
        ? "已生成（OpenAddresses 内置样本 + RandomUser）。"
        : "已生成（Zippopotam.us + RandomUser）。";
  } catch {
    message.textContent = "生成失败，请重试。";
  } finally {
    generateBtn.disabled = false;
  }
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(getOutputText());
    message.textContent = "复制成功。";
  } catch {
    message.textContent = "复制失败，请手动复制。";
  }
});

generateBtn.click();
