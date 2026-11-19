(() => {
  const config = window.NARA_CONFIG || {};
  const supabaseUrl = String(config.supabaseUrl || "").trim();
  const supabaseKey = String(config.supabasePublishableKey || "").trim();
  const demoMode = !supabaseUrl && !supabaseKey;
  const STORAGE = { public: "nara-public-v3", private: "nara-private-v3", adminToken: "nara-admin-token" };
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  let publicItems = [], privateItems = [], adminItems = [], activeType = "all", adminToken = sessionStorage.getItem(STORAGE.adminToken) || "";
  const feedGrid = $("#feedGrid"), toastNode = $("#toast");

  const typeName = type => ({saran:"Saran",kritik:"Kritik",apresiasi:"Apresiasi"}[type] || "Aspirasi");
  const statusName = status => ({new:"Diterima",in_review:"Sedang dibahas",in_progress:"Sedang ditindaklanjuti",done:"Selesai"}[status] || "Diterima");
  const statusClass = status => ({new:"status-new",in_review:"status-review",in_progress:"status-progress",done:"status-done"}[status] || "status-new");
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
  const relativeTime = value => { if (!value) return "Baru saja"; const days = Math.max(0, Math.floor((Date.now()-new Date(value).getTime())/86400000)); return days < 1 ? "Hari ini" : days === 1 ? "1 hari lalu" : `${days} hari lalu`; };
  const toast = message => { toastNode.textContent=message;toastNode.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>toastNode.classList.remove("show"),2600); };
  if (Boolean(supabaseUrl) !== Boolean(supabaseKey)) throw new Error("Isi supabaseUrl dan supabasePublishableKey di config.js.");
  if (!demoMode && (!window.supabase || !window.supabase.createClient)) throw new Error("Supabase JS gagal dimuat.");
  const supabase = demoMode ? null : window.supabase.createClient(supabaseUrl, supabaseKey);
  const fromDatabase = row => ({...row, createdAt:row.created_at});

  async function loadPublic() {
    if (demoMode) {
      const saved = read(STORAGE.public).filter(item => item.visibility === "public");
      publicItems = saved;
    } else {
      try {
        const {data,error}=await supabase.from("aspirations").select("*").eq("visibility","public").order("created_at",{ascending:false});
        if(error)throw error;
        publicItems=data.map(fromDatabase);
      }
      catch (error) { publicItems=[]; toast("Aspirasi belum dapat dimuat. Periksa konfigurasi dan koneksi Supabase."); console.error(error); }
    }
    renderFeed(); renderStats();
  }
  function renderStats() {
    const total = publicItems.length;
    const progressed = publicItems.filter(item => item.status === "done" || item.status === "in_progress").length;
    $("#statTotal").textContent = total;
    $("#statProgress").textContent = total ? `${Math.round(progressed/total*100)}%` : "0%";
  }
  function renderFeed() {
    const search = $("#searchInput").value.trim().toLowerCase();
    const topic = $("#topicFilter").value;
    const items = publicItems.filter(item => {
      const matchesType = activeType === "all" || item.type === activeType;
      const matchesTopic = topic === "all" || item.category === topic;
      const matchesSearch = !search || `${item.title} ${item.message} ${item.category}`.toLowerCase().includes(search);
      return item.visibility === "public" && matchesType && matchesTopic && matchesSearch;
    });
    if (!items.length) { feedGrid.innerHTML='<div class="empty-state">Belum ada aspirasi yang cocok. Coba ubah kata pencarian atau filter.</div>'; return; }
    feedGrid.innerHTML = items.map(item => `<article class="idea-card"><div class="idea-top"><span class="type-label ${escapeHTML(item.type)}">${escapeHTML(typeName(item.type))}</span><span class="status ${statusClass(item.status)}"><i></i>${escapeHTML(statusName(item.status))}</span></div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.message)}</p><div class="idea-footer"><span class="idea-footer-left"><span class="mini-avatar">${item.anonymous ? "✦" : escapeHTML((item.name||"S").slice(0,1).toUpperCase())}</span>${item.anonymous ? "Anonim" : escapeHTML(item.name || "Siswa")} · ${escapeHTML(relativeTime(item.createdAt))}</span><span class="topic-chip">${escapeHTML(item.category)}</span></div></article>`).join("");
  }
  $("#searchInput").addEventListener("input", renderFeed);
  $("#topicFilter").addEventListener("change", renderFeed);
  $$(".filter-chip").forEach(button=>button.addEventListener("click",()=>{$(".filter-chip.active").classList.remove("active");button.classList.add("active");activeType=button.dataset.type;renderFeed();}));

  const formBackdrop=$("#formBackdrop"), form=$("#aspirationForm"), formTitle=$("#formTitle"), successPanel=$("#successPanel"), demoWarning=$("#demoWarning");
  function updatePrivacyControls(){
    const identity=$("input[name='identity']:checked").value;
    const visibility=$("input[name='visibility']:checked").value;
    $("#nameField").hidden=identity!=="named"; $("#sender").required=identity==="named";
    $("#privacyMessage").textContent=visibility==="private" ? (demoMode ? "🔒 Pesan pribadi hanya tersimpan di browser ini dalam mode demo. Hubungkan Supabase agar pesan dapat diterima OSIS." : "🔒 Pesan pribadi hanya dapat dibaca pengurus OSIS yang berwenang dan tidak muncul di laman publik.") : "🔒 Pesan publik dapat dibaca siapa saja. Kamu tetap bisa mengirimnya secara anonim.";
    demoWarning.hidden=!demoMode;
  }
  function openForm(){formBackdrop.hidden=false;document.body.classList.add("modal-open");formTitle.focus?.();}
  function closeForm(){formBackdrop.hidden=true;document.body.classList.remove("modal-open");}
  $$('[data-open-form]').forEach(button=>button.addEventListener("click",openForm));
  $$('[data-close-form]').forEach(button=>button.addEventListener("click",closeForm));
  formBackdrop.addEventListener("click",event=>{if(event.target===formBackdrop)closeForm();});
  $$('input[name="visibility"],input[name="identity"]').forEach(input=>input.addEventListener("change",updatePrivacyControls));
  updatePrivacyControls();
  form.addEventListener("submit", async event=>{
    event.preventDefault();
    const visibility=$("input[name='visibility']:checked").value, anonymous=$("input[name='identity']:checked").value==="anonymous";
    const item={type:$("#kind").value,category:$("#category").value,title:$("#title").value.trim(),message:$("#message").value.trim(),anonymous,name:anonymous?null:$("#sender").value.trim(),visibility};
    try {
      if(demoMode){item.id=`demo-${Date.now()}`;item.status="new";item.createdAt=new Date().toISOString();if(visibility==="public"){const saved=read(STORAGE.public);saved.unshift(item);write(STORAGE.public,saved);}else{const saved=read(STORAGE.private);saved.unshift(item);write(STORAGE.private,saved);}}
      else {
        const {error}=await supabase.from("aspirations").insert({type:item.type,category:item.category,title:item.title,message:item.message,anonymous:item.anonymous,name:item.name,visibility:item.visibility});
        if(error)throw error;
      }
      $("#successMessage").textContent=demoMode?"Kiriman tersimpan di browser ini saja dan belum diterima OSIS.":visibility==="private"?"Pesan pribadi berhasil dikirim kepada OSIS. Pesan ini tidak ditampilkan pada laman publik.":"Aspirasi berhasil dikirim dan akan muncul di laman.";
      form.hidden=true;successPanel.hidden=false;await loadPublic();
    } catch(error) { toast("Pesan belum berhasil dikirim. Coba lagi sebentar.");console.error(error); }
  });
  function resetForm(){form.reset();form.hidden=false;successPanel.hidden=true;updatePrivacyControls();}
  $$('[data-close-form]').forEach(button=>button.addEventListener("click",resetForm));
  document.addEventListener("keydown",event=>{if(event.key==="Escape"){if(!formBackdrop.hidden)closeForm();if(!adminBackdrop.hidden)closeAdmin();}});

  const adminBackdrop=$("#adminBackdrop"), adminLogin=$("#adminLogin"), adminDashboard=$("#adminDashboard"), adminList=$("#adminList");
  function openAdmin(){adminBackdrop.hidden=false;document.body.classList.add("modal-open");$("#adminHint").textContent=demoMode?"Mode demo hanya menampilkan kiriman yang tersimpan di browser ini. Login demo tidak aman untuk penggunaan sungguhan.":"Masuk dengan akun OSIS yang terdaftar untuk membaca aspirasi publik dan pribadi.";if(demoMode&&adminToken)showDashboard();else if(!demoMode)supabase.auth.getSession().then(({data,error})=>{if(error){toast("Sesi OSIS belum dapat diperiksa.");console.error(error);}else if(data.session)showDashboard();});}
  function closeAdmin(){adminBackdrop.hidden=true;document.body.classList.remove("modal-open");}
  $("#openAdmin").addEventListener("click",openAdmin);$$("[data-close-admin]").forEach(button=>button.addEventListener("click",closeAdmin));adminBackdrop.addEventListener("click",event=>{if(event.target===adminBackdrop)closeAdmin();});
  function allDemoItems(){return [...read(STORAGE.private),...read(STORAGE.public)].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));}
  async function showDashboard(){adminLogin.hidden=true;adminDashboard.hidden=false;try{if(demoMode)adminItems=allDemoItems();else{const {data:{user},error:userError}=await supabase.auth.getUser();if(userError)throw userError;if(!user)throw new Error("Sesi OSIS tidak ditemukan.");const {data:membership,error:membershipError}=await supabase.from("osis_admins").select("user_id").eq("user_id",user.id).maybeSingle();if(membershipError)throw membershipError;if(!membership)throw new Error("Akun ini belum terdaftar sebagai pengurus OSIS.");const {data,error}=await supabase.from("aspirations").select("*").order("created_at",{ascending:false});if(error)throw error;adminItems=data.map(fromDatabase);}renderAdmin();}catch(error){adminDashboard.hidden=true;adminLogin.hidden=false;toast("Data OSIS belum dapat dimuat. Periksa akun dan hak akses.");console.error(error);}}
  function renderAdmin(){
    $("#adminCount").textContent=`${adminItems.length} aspirasi`;
    if(!adminItems.length){adminList.innerHTML='<div class="empty-state">Belum ada aspirasi untuk dikelola.</div>';return;}
    adminList.innerHTML=adminItems.map(item=>`<article class="admin-item"><div class="admin-item-top"><span class="type-label ${escapeHTML(item.type)}">${escapeHTML(typeName(item.type))} · ${item.visibility==="private"?"PRIBADI":"PUBLIK"}</span><span class="status ${statusClass(item.status)}"><i></i>${escapeHTML(statusName(item.status))}</span></div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.message)}</p><div class="admin-item-bottom"><span>${item.anonymous?"Anonim":`Nama: ${escapeHTML(item.name||"Siswa")}`} · ${escapeHTML(item.category)}</span><label>Status <select data-status-id="${escapeHTML(item.id)}"><option value="new" ${item.status==="new"?"selected":""}>Diterima</option><option value="in_review" ${item.status==="in_review"?"selected":""}>Sedang dibahas</option><option value="in_progress" ${item.status==="in_progress"?"selected":""}>Sedang ditindaklanjuti</option><option value="done" ${item.status==="done"?"selected":""}>Selesai</option></select></label></div></article>`).join("");
    $$('[data-status-id]',adminList).forEach(select=>select.addEventListener("change",()=>updateStatus(select.dataset.statusId,select.value)));
  }
  async function updateStatus(id,status){try{if(demoMode){for(const key of [STORAGE.public,STORAGE.private]){const values=read(key);const item=values.find(row=>String(row.id)===String(id));if(item){item.status=status;write(key,values);}}adminItems=allDemoItems();publicItems=read(STORAGE.public).filter(x=>x.visibility==="public");}else{const {error:updateError}=await supabase.from("aspirations").update({status}).eq("id",id);if(updateError)throw updateError;const {data:adminData,error:adminError}=await supabase.from("aspirations").select("*").order("created_at",{ascending:false});if(adminError)throw adminError;adminItems=adminData.map(fromDatabase);const {data:publicData,error:publicError}=await supabase.from("aspirations").select("*").eq("visibility","public").order("created_at",{ascending:false});if(publicError)throw publicError;publicItems=publicData.map(fromDatabase);}renderAdmin();renderFeed();renderStats();toast("Status tindak lanjut diperbarui.");}catch(error){toast("Status belum berhasil diperbarui.");console.error(error);}}
  $("#adminLoginForm").addEventListener("submit",async event=>{event.preventDefault();if(demoMode){adminToken="demo-session";sessionStorage.setItem(STORAGE.adminToken,adminToken);await showDashboard();return;}try{const {error}=await supabase.auth.signInWithPassword({email:$("#adminEmail").value,password:$("#adminPassword").value});if(error)throw error;await showDashboard();}catch(error){toast("Login gagal. Periksa email dan kata sandi.");console.error(error);}});
  $("#adminLogout").addEventListener("click",async()=>{if(!demoMode){const {error}=await supabase.auth.signOut();if(error){toast("Keluar belum berhasil.");console.error(error);return;}}adminToken="";sessionStorage.removeItem(STORAGE.adminToken);adminDashboard.hidden=true;adminLogin.hidden=false;$("#adminPassword").value="";toast("Kamu sudah keluar dari dashboard.");});

  $("#menuToggle").addEventListener("click",()=>$("#navLinks").classList.toggle("open"));
  $$("#navLinks a").forEach(link=>link.addEventListener("click",()=>$("#navLinks").classList.remove("open")));
  document.addEventListener("keydown",event=>{if(event.key==="Escape")$("#navLinks").classList.remove("open");});
  loadPublic();
})();
