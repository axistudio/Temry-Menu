// ===== CONFIG =====
const SHEET_CSV_URL =
   "https://docs.google.com/spreadsheets/d/e/2PACX-1vTKbgQCUl6nOaNHBFqyAuOE7Ag8GOVyogzGXm5rt0H_A5blDVnAFuI9q1CEDeD_rrfQbNU1ivyMgihe/pub?output=csv";

// Sheet names (order matters for tabs)
const SHEET_NAMES = [
   { gid: "505295436", label: "سندوتشات الطعمية" },
   { gid: "764413310", label: "سندوتشات الفول" },
   { gid: "1203775176", label: "اقراص الطعمية" },
   { gid: "1840981246", label: "العلب" },
   { gid: "1468404260", label: "الاطباق" },
   { gid: "204621584", label: "سندوتشات الفارم" },
   { gid: "1464489132", label: "سندوتشات البيض" },
   { gid: "1424825533", label: "سندوتشات الجبنة" },
   { gid: "1165061884", label: "سندوتشات الحادق" },
   { gid: "1098802646", label: "سندوتشات المهروسة" },
   { gid: "1428027237", label: "الرول" },
   { gid: "1689659975", label: "اللحوم" },
   { gid: "1991085730", label: "سندوتشات الحلو" },
];

// قائمة الفروع (أضف فروعك هنا)
const BRANCHES = [
   { name: "قويسنا", wa: "201019280900" },
   { name: "بركة السبع", wa: "201016206073" },
   { name: "منيا القمح", wa: "201060548815" },
];

// ===== PARSE CSV =====
function parseCSV(text) {
   const lines = text
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
   if (lines.length < 2) return [];
   return lines
      .slice(1)
      .map((line) => {
         const cols = line
            .split(",")
            .map((c) => c.replace(/^"|"$/g, "").trim());
         return {
            name: cols[0] || "",
            price: cols[1] || "",
            price2: cols[2] || "",
            price3: cols[3] || "",
         };
      })
      .filter((r) => r.name);
}

// ===== FETCH ONE SHEET =====
async function fetchSheet(gid) {
   const url = SHEET_CSV_URL.replace("output=csv", `output=csv&gid=${gid}`);
   const res = await fetch(url);
   if (!res.ok) throw new Error("fetch failed");
   const text = await res.text();
   return parseCSV(text);
}

// ===== CART STATE & LOGIC =====
let allSheets = [];
let cart = {};

function updateCartUI() {
   let totalItems = 0;
   let totalPrice = 0;

   for (let key in cart) {
      totalItems += cart[key].qty;
      totalPrice += cart[key].price * cart[key].qty;
   }

   const cartIcon = document.getElementById("cart-icon");
   const badge = document.getElementById("cart-badge");
   const modalTotal = document.getElementById("modal-total-price");

   if (totalItems > 0) {
      cartIcon.style.display = "flex";
      badge.textContent = totalItems;
   } else {
      cartIcon.style.display = "none";
   }

   if (modalTotal) {
      modalTotal.textContent = totalPrice;
   }

   // trigger re-rendering of the modal items if it's open
   renderModalItems();

   // trigger re-rendering of all item cards currently on screen
   document.querySelectorAll(".item-actions").forEach((container) => {
      const itemName = container.dataset.itemName;
      const itemPrice = container.dataset.itemPrice;
      if (itemName && itemPrice) {
         renderActionsForContainer(container, {
            name: itemName,
            price: Number(itemPrice),
         });
      }
   });
}

function addToCart(item) {
   if (!cart[item.name]) {
      cart[item.name] = { price: Number(item.price), qty: 1 };
   } else {
      cart[item.name].qty += 1;
   }
   updateCartUI();
}

function removeFromCart(item) {
   if (cart[item.name]) {
      cart[item.name].qty -= 1;
      if (cart[item.name].qty === 0) {
         delete cart[item.name];
      }
   }
   updateCartUI();
}

function openCart() {
   const modal = document.getElementById("cart-modal");
   modal.style.display = "flex";

   // تنظيف اختيار الفرع عند فتح السلة
   const branchSelect = document.getElementById("branch-select");
   if (branchSelect) {
      branchSelect.innerHTML = '<option value="">-- اختر الفرع --</option>';
      BRANCHES.forEach((b, i) => {
         const opt = document.createElement("option");
         opt.value = i;
         opt.textContent = b.name;
         branchSelect.appendChild(opt);
      });
      branchSelect.value = "";

      const sendBtn = document.getElementById("modal-send-btn");
      if (sendBtn) {
         sendBtn.disabled = true;
         sendBtn.classList.remove("enabled");
      }

      branchSelect.onchange = (e) => {
         if (e.target.value !== "") {
            sendBtn.disabled = false;
            sendBtn.classList.add("enabled");
         } else {
            sendBtn.disabled = true;
            sendBtn.classList.remove("enabled");
         }
      };
   }

   renderModalItems();
}

function closeCart() {
   document.getElementById("cart-modal").style.display = "none";
}

function renderModalItems() {
   const container = document.getElementById("cart-items-container");
   if (!container) return;

   container.innerHTML = "";
   let hasItems = false;

   for (let name in cart) {
      hasItems = true;
      const item = cart[name];
      const div = document.createElement("div");
      div.className = "cart-modal-item";

      div.innerHTML = `
         <div class="c-item-info">
            <div class="c-item-name">${name}</div>
            <div class="c-item-price">${item.price * item.qty} جنيه</div>
         </div>
         <div class="qty-controls">
            <button class="qty-btn minus-btn" onclick="removeFromCart({name: '${name}', price: ${item.price}})">&minus;</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn plus-btn" onclick="addToCart({name: '${name}', price: ${item.price}})">+</button>
         </div>
      `;
      container.appendChild(div);
   }

   if (!hasItems) {
      container.innerHTML = `<div style="text-align:center; color:var(--muted); padding: 20px;">السلة فارغة</div>`;
   }
}

function sendOrder() {
   if (Object.keys(cart).length === 0) return;

   const branchIdx = document.getElementById("branch-select").value;
   if (branchIdx === "") return;

   const selectedBranch = BRANCHES[branchIdx];
   let lines = [`*طلب جديد من فرع: ${selectedBranch.name}*`, ""];
   lines.push("أهلا، عايز أطلب الآتي:");
   lines.push("");

   let totalPrice = 0;
   for (let name in cart) {
      let item = cart[name];
      let itemTotal = item.price * item.qty;
      totalPrice += itemTotal;
      lines.push(`- ${name} × ${item.qty} = ${itemTotal} جنيه`);
   }

   lines.push("");
   lines.push(`*الإجمالي: ${totalPrice} جنيه*`);

   const msg = encodeURIComponent(lines.join("\n"));
   window.open(`https://wa.me/${selectedBranch.wa}?text=${msg}`, "_blank");
}

function renderActionsForContainer(container, item) {
   container.innerHTML = "";
   const currentQty = cart[item.name] ? cart[item.name].qty : 0;

   if (currentQty === 0) {
      const btn = document.createElement("button");
      btn.className = "add-btn";
      btn.onclick = () => addToCart(item);
      btn.innerHTML = `<svg viewBox="0 0 24 24" class="add-icon"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> طلب `;
      container.appendChild(btn);
   } else {
      const controls = document.createElement("div");
      controls.className = "qty-controls";

      const minus = document.createElement("button");
      minus.className = "qty-btn minus-btn";
      minus.onclick = () => removeFromCart(item);
      minus.innerHTML = `&minus;`;

      const qtyShow = document.createElement("span");
      qtyShow.className = "qty-num";
      qtyShow.textContent = currentQty;

      const plus = document.createElement("button");
      plus.className = "qty-btn plus-btn";
      plus.onclick = () => addToCart(item);
      plus.innerHTML = `+`;

      controls.appendChild(minus);
      controls.appendChild(qtyShow);
      controls.appendChild(plus);
      container.appendChild(controls);
   }
}

// ===== BUILD DOM =====
function buildCard(item) {
   const card = document.createElement("div");
   card.className = "item-card";

   const name = document.createElement("div");
   name.className = "item-name";
   name.textContent = item.name;

   if (item.price2) {
      const variants = [
         {
            label: "صغير",
            price: item.price,
            name: `${item.name} (صغير)`,
         },
         {
            label: "كبير",
            price: item.price2,
            name: `${item.name} (كبير)`,
         },
      ];

      // If there's a third price, add it (maybe as 'جامبو' or similar, but sticking to Small/Large as requested)
      if (item.price3) {
         variants.push({
            label: "1 كيلو / عائلي",
            price: item.price3,
            name: `${item.name} (عائلي)`,
         });
      }

      const select = document.createElement("select");
      select.className = "variant-select";
      variants.forEach((v, index) => {
         const option = document.createElement("option");
         option.value = index;
         option.textContent = `${v.label} — ${v.price} ج `;
         select.appendChild(option);
      });

      const right = document.createElement("div");
      right.className = "item-right";

      const actions = document.createElement("div");
      actions.className = "item-actions";

      let selectedVariant = variants[0];
      actions.dataset.itemName = selectedVariant.name;
      actions.dataset.itemPrice = selectedVariant.price;

      select.addEventListener("change", (e) => {
         selectedVariant = variants[e.target.value];
         actions.dataset.itemName = selectedVariant.name;
         actions.dataset.itemPrice = selectedVariant.price;
         renderActionsForContainer(actions, selectedVariant);
      });

      renderActionsForContainer(actions, selectedVariant);

      right.appendChild(select);
      right.appendChild(actions);

      card.appendChild(name);
      card.appendChild(right);
      return card;
   }

   const right = document.createElement("div");
   right.className = "item-right";

   const price = document.createElement("div");
   price.className = "item-price";
   price.innerHTML = `<span>جنيه</span>${item.price}`;

   const actions = document.createElement("div");
   actions.className = "item-actions";
   actions.dataset.itemName = item.name;
   actions.dataset.itemPrice = item.price;

   renderActionsForContainer(actions, item);

   right.appendChild(price);
   right.appendChild(actions);
   card.appendChild(name);
   card.appendChild(right);

   return card;
}

function showCategory(index) {
   const main = document.getElementById("menu-content");
   const sheet = allSheets[index];

   if (!sheet) return;

   document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.toggle("active", parseInt(b.dataset.index) === index);
   });

   main.innerHTML = "";

   const sec = document.createElement("div");
   sec.className = "category-section";
   sec.id = `section-${index}`;
   sec.style.animationDelay = `0s`;

   const title = document.createElement("div");
   title.className = "category-title";
   title.textContent = sheet.label;

   const div = document.createElement("div");
   div.className = "category-divider";

   const grid = document.createElement("div");
   grid.className = "items-grid";

   sheet.items.forEach((item) => grid.appendChild(buildCard(item)));

   sec.appendChild(title);
   sec.appendChild(div);
   sec.appendChild(grid);
   main.appendChild(sec);

   window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildMenu(sheets) {
   allSheets = sheets;
   const nav = document.getElementById("tabs-container");

   let firstValidIndex = -1;

   sheets.forEach((sheet, i) => {
      if (!sheet.items || !sheet.items.length) return;

      if (firstValidIndex === -1) {
         firstValidIndex = i;
      }

      // Tab button
      const btn = document.createElement("button");
      btn.className = "tab-btn";

      btn.textContent = sheet.label;

      btn.dataset.index = i;
      btn.addEventListener("click", () => showCategory(i));
      nav.appendChild(btn);
   });

   // Show nav + content
   document.getElementById("tab-nav").style.display = "block";
   document.getElementById("menu-content").style.display = "block";

   if (firstValidIndex !== -1) {
      showCategory(firstValidIndex);
   }
}

// ===== MAIN =====
async function loadMenu() {
   try {
      const results = await Promise.all(
         SHEET_NAMES.map(async (s) => {
            try {
               const items = await fetchSheet(s.gid);
               return { label: s.label, items };
            } catch {
               return { label: s.label, items: [] };
            }
         }),
      );

      document.getElementById("loading").style.display = "none";

      const hasData = results.some((r) => r.items.length > 0);
      if (!hasData) {
         document.getElementById("error-msg").style.display = "block";
         return;
      }

      buildMenu(results);
   } catch (err) {
      document.getElementById("loading").style.display = "none";
      document.getElementById("error-msg").style.display = "block";
   }
}

loadMenu();
