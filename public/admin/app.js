const state = {
  origins: [],
  groups: [],
  editingOriginId: null,
  editingGroupId: null,
};

const alertBox = document.getElementById('alert');
const originsTableBody = document.getElementById('originsTableBody');
const groupsTableBody = document.getElementById('groupsTableBody');

function showAlert(message, type = 'success') {
  alertBox.textContent = message;
  alertBox.className = `alert show ${type}`;
  setTimeout(() => {
    alertBox.className = 'alert';
  }, 3500);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function statusBadge(status) {
  return `<span class="badge ${status}">${status === 'active' ? 'Ativo' : 'Inativo'}</span>`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || data.error || 'Erro na requisição');
  }

  return data;
}

async function loadOrigins() {
  state.origins = await fetchJson('/api/origins');
  renderOrigins();
}

async function loadGroups() {
  state.groups = await fetchJson('/api/groups');
  renderGroups();
}

function renderOrigins() {
  originsTableBody.innerHTML = state.origins.map(item => `
    <tr>
      <td>${item.id}</td>
      <td><strong>${escapeHtml(item.origin_key)}</strong></td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.niche)}</td>
      <td>${statusBadge(item.status)}</td>
      <td>
        <div class="actions">
          <button class="small secondary" onclick="editOrigin(${item.id})">Editar</button>
          <button class="small danger" onclick="removeOrigin(${item.id})">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderGroups() {
  groupsTableBody.innerHTML = state.groups.map(item => `
    <tr>
      <td>${item.id}</td>
      <td><strong>${escapeHtml(item.slug)}</strong></td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.niche)}</td>
      <td>${escapeHtml(item.group_code)}</td>
      <td><a href="${escapeHtml(item.web)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.web)}</a></td>
      <td>${statusBadge(item.status)}</td>
      <td>
        <div class="actions">
          <button class="small secondary" onclick="editGroup(${item.id})">Editar</button>
          <button class="small danger" onclick="removeGroup(${item.id})">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function resetOriginForm() {
  state.editingOriginId = null;
  document.getElementById('originFormTitle').textContent = 'Nova origem';
  document.getElementById('origin_id').value = '';
  document.getElementById('origin_key').value = '';
  document.getElementById('origin_name').value = '';
  document.getElementById('origin_niche').value = 'geral';
  document.getElementById('origin_status').value = 'active';
}

function resetGroupForm() {
  state.editingGroupId = null;
  document.getElementById('groupFormTitle').textContent = 'Novo grupo';
  document.getElementById('group_id').value = '';
  document.getElementById('group_slug').value = '';
  document.getElementById('group_name').value = '';
  document.getElementById('group_niche').value = 'geral';
  document.getElementById('group_code').value = '';
  document.getElementById('group_status').value = 'active';
}

window.editOrigin = function(id) {
  const item = state.origins.find(x => x.id === id);
  if (!item) return;

  state.editingOriginId = id;
  document.getElementById('originFormTitle').textContent = `Editando origem #${id}`;
  document.getElementById('origin_id').value = item.id;
  document.getElementById('origin_key').value = item.origin_key;
  document.getElementById('origin_name').value = item.name;
  document.getElementById('origin_niche').value = item.niche;
  document.getElementById('origin_status').value = item.status;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.editGroup = function(id) {
  const item = state.groups.find(x => x.id === id);
  if (!item) return;

  state.editingGroupId = id;
  document.getElementById('groupFormTitle').textContent = `Editando grupo #${id}`;
  document.getElementById('group_id').value = item.id;
  document.getElementById('group_slug').value = item.slug;
  document.getElementById('group_name').value = item.name;
  document.getElementById('group_niche').value = item.niche;
  document.getElementById('group_code').value = item.group_code;
  document.getElementById('group_status').value = item.status;
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

window.removeOrigin = async function(id) {
  if (!confirm('Deseja realmente excluir esta origem?')) return;
  try {
    await fetchJson(`/api/origins/${id}`, { method: 'DELETE' });
    showAlert('Origem excluída com sucesso.');
    await loadOrigins();
    resetOriginForm();
  } catch (error) {
    showAlert(error.message, 'error');
  }
}

window.removeGroup = async function(id) {
  if (!confirm('Deseja realmente excluir este grupo?')) return;
  try {
    await fetchJson(`/api/groups/${id}`, { method: 'DELETE' });
    showAlert('Grupo excluído com sucesso.');
    await loadGroups();
    resetGroupForm();
  } catch (error) {
    showAlert(error.message, 'error');
  }
}

document.getElementById('originForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    origin_key: document.getElementById('origin_key').value.trim(),
    name: document.getElementById('origin_name').value.trim(),
    niche: document.getElementById('origin_niche').value,
    status: document.getElementById('origin_status').value,
  };

  const id = document.getElementById('origin_id').value;
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/origins/${id}` : '/api/origins';

  try {
    await fetchJson(url, { method, body: JSON.stringify(payload) });
    showAlert(id ? 'Origem atualizada com sucesso.' : 'Origem criada com sucesso.');
    resetOriginForm();
    await loadOrigins();
  } catch (error) {
    showAlert(error.message, 'error');
  }
});

document.getElementById('groupForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    slug: document.getElementById('group_slug').value.trim().toLowerCase(),
    name: document.getElementById('group_name').value.trim(),
    niche: document.getElementById('group_niche').value,
    group_code: document.getElementById('group_code').value.trim(),
    status: document.getElementById('group_status').value,
  };

  const id = document.getElementById('group_id').value;
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/groups/${id}` : '/api/groups';

  try {
    await fetchJson(url, { method, body: JSON.stringify(payload) });
    showAlert(id ? 'Grupo atualizado com sucesso.' : 'Grupo criado com sucesso.');
    resetGroupForm();
    await loadGroups();
  } catch (error) {
    showAlert(error.message, 'error');
  }
});

document.getElementById('originResetBtn').addEventListener('click', resetOriginForm);
document.getElementById('groupResetBtn').addEventListener('click', resetGroupForm);

async function init() {
  try {
    await Promise.all([loadOrigins(), loadGroups()]);
    resetOriginForm();
    resetGroupForm();
  } catch (error) {
    showAlert(error.message, 'error');
  }
}

init();
