/* ============================================================================
 * record-nav.js — Reusable record-navigation controller
 * ----------------------------------------------------------------------------
 * Standardises the three-tier "open a record" interaction used across every
 * list page (Items, Stock by location, Sales orders, Invoices, Vendors, …):
 *
 *   1. single-click a row          →  open the SIDE DRAWER  (quick preview card)
 *   2. "Open card" button in drawer →  open the CENTERED CARD (modal)
 *   3. double-click a row           →  open the record in a NEW TAB (full page)
 *
 * One controller instance per host component. It owns a single unified slice
 * of the host's React state (`host.state.nav`) so every page shares the exact
 * same selection / tab model and behaves identically — change it once here and
 * all pages stay consistent.
 *
 * The host wires three concerns it alone knows about, via optional hooks:
 *   host.openRecordCard(entity, id)  — open this entity's centered card
 *   host.closeRecordCard()           — close whatever centered card is open
 *   host.recordCardOpen()            — is any centered card currently open?
 *   host.navTabLabel(entity, id)     — friendly label for a new-tab pill
 *   host.recordContext(entity,id,e)  — right-click handler (optional)
 *
 * Usage in a row:  <div onClick="{{ r.select }}"
 *                       onDoubleClick="{{ r.openTab }}"
 *                       onContextMenu="{{ r.ctx }}"> … </div>
 *   built with:    const r = host.nav.rowProps('orders', o.no);
 * ========================================================================== */

(function (root) {
  'use strict';

  var NAV_INIT = {
    sel: null,     // { entity, id } | null          → which row's drawer is open
    tabs: {},      // { [entity]: [id, …] }           → open full-page tabs
    active: {},    // { [entity]: id | 'list' }       → active tab per page
  };

  function same(a, entity, id) {
    return !!a && a.entity === entity && a.id === id;
  }

  function createRecordNav(host) {
    function nav() { return host.state.nav || NAV_INIT; }

    function patch(p) {
      host.setState(function (s) {
        var cur = s.nav || NAV_INIT;
        return { nav: Object.assign({}, cur, p) };
      });
    }

    var api = {
      INIT: NAV_INIT,

      /* ---------------------------------------------------------------- *
       * Queries — derive the legacy per-page view-state from one model    *
       * ---------------------------------------------------------------- */
      selId: function (entity) {
        var n = nav();
        return same(n.sel, entity, n.sel && n.sel.id) && n.sel.entity === entity ? n.sel.id : null;
      },
      isSel: function (entity, id) { return same(nav().sel, entity, id); },
      openTabs: function (entity) { return (nav().tabs && nav().tabs[entity]) || []; },
      activeTab: function (entity) {
        var a = nav().active || {};
        return a[entity] || 'list';
      },
      isListView: function (entity) { return api.activeTab(entity) === 'list'; },
      activeId: function (entity) {
        var t = api.activeTab(entity);
        return t === 'list' ? null : t;
      },

      /* ---------------------------------------------------------------- *
       * Row binding — the one function every page's rows call             *
       * ---------------------------------------------------------------- */
      rowProps: function (entity, id) {
        return {
          isSel: same(nav().sel, entity, id),
          select: function () { api.select(entity, id); },
          openCard: function () { api.openCard(entity, id); },
          openTab: function () { api.openTab(entity, id); },
          ctx: function (e) {
            if (host.recordContext) host.recordContext(entity, id, e);
          },
        };
      },

      /* ---------------------------------------------------------------- *
       * Transitions                                                       *
       * ---------------------------------------------------------------- */
      // single-click: toggle the side drawer for this row
      select: function (entity, id) {
        if (same(nav().sel, entity, id)) { patch({ sel: null }); return; }
        patch({ sel: { entity: entity, id: id } });
        if (host.onRecordSelect) host.onRecordSelect(entity, id);
      },
      closeDrawer: function () { patch({ sel: null }); },
      // force-select a row (no toggle) — used by context menus / cross-page jumps
      setSel: function (entity, id) { patch({ sel: { entity: entity, id: id } }); },

      // drawer button: open the centered card (delegated to host content)
      openCard: function (entity, id) {
        patch({ sel: { entity: entity, id: id } });
        if (host.openRecordCard) host.openRecordCard(entity, id);
      },
      closeCard: function () { if (host.closeRecordCard) host.closeRecordCard(); },

      // double-click: open the record in a new full-page tab
      openTab: function (entity, id) {
        var n = nav();
        var tabs = Object.assign({}, n.tabs);
        var list = (tabs[entity] || []).slice();
        if (list.indexOf(id) === -1) list.push(id);
        tabs[entity] = list;
        var active = Object.assign({}, n.active);
        active[entity] = id;
        patch({ tabs: tabs, active: active, sel: null });
        if (host.closeRecordCard) host.closeRecordCard();
      },
      activateTab: function (entity, id) {
        var active = Object.assign({}, nav().active);
        active[entity] = id;
        patch({ active: active });
      },
      backToList: function (entity) {
        var active = Object.assign({}, nav().active);
        active[entity] = 'list';
        patch({ active: active });
      },
      closeTab: function (entity, id) {
        var n = nav();
        var list = (n.tabs[entity] || []).filter(function (x) { return x !== id; });
        var tabs = Object.assign({}, n.tabs); tabs[entity] = list;
        var active = Object.assign({}, n.active);
        if ((active[entity] || 'list') === id) {
          active[entity] = list.length ? list[list.length - 1] : 'list';
        }
        patch({ tabs: tabs, active: active });
      },

      /* ---------------------------------------------------------------- *
       * Tab strip — render-ready descriptors for the page tab bar         *
       * ---------------------------------------------------------------- */
      tabBar: function (entity, listLabel) {
        var n = nav();
        var list = (n.tabs && n.tabs[entity]) || [];
        var active = (n.active && n.active[entity]) || 'list';
        function tabStyle(on) {
          return {
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            height: '30px', padding: '0 4px 0 12px', borderRadius: '8px 8px 0 0',
            border: '1px solid ' + (on ? 'var(--border)' : 'transparent'),
            borderBottom: on ? '1px solid var(--background)' : '1px solid transparent',
            marginBottom: '-1px',
            background: on ? 'var(--background)' : 'transparent',
            color: on ? 'var(--foreground)' : 'var(--muted-fg)',
            fontSize: '12.5px', fontWeight: on ? 600 : 500,
            cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', fontFamily: 'inherit',
          };
        }
        var out = [{
          id: 'list', label: listLabel || 'List', closeable: false,
          active: active === 'list', style: tabStyle(active === 'list'),
          select: function () { api.backToList(entity); },
          close: function () {},
        }];
        list.forEach(function (id) {
          out.push({
            id: id,
            label: host.navTabLabel ? host.navTabLabel(entity, id) : String(id),
            closeable: true, active: active === id, style: tabStyle(active === id),
            select: function () { api.activateTab(entity, id); },
            close: function (e) { if (e && e.stopPropagation) e.stopPropagation(); api.closeTab(entity, id); },
          });
        });
        return out;
      },

      /* ---------------------------------------------------------------- *
       * Escape / back — close the deepest open surface, return handled    *
       * ---------------------------------------------------------------- */
      handleEsc: function () {
        var n = nav();
        if (host.recordCardOpen && host.recordCardOpen()) { api.closeCard(); return true; }
        var act = n.active || {};
        for (var ent in act) {
          if (act.hasOwnProperty(ent) && (act[ent] || 'list') !== 'list') { api.backToList(ent); return true; }
        }
        if (n.sel) { api.closeDrawer(); return true; }
        return false;
      },
    };

    return api;
  }

  root.RecordNav = { createRecordNav: createRecordNav, NAV_INIT: NAV_INIT };
})(typeof window !== 'undefined' ? window : this);
