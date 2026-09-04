window.__ModuleLoader__.load({
  id: '@liang/dsh-workbench-home',
  factory: (require) => {
    const module = { exports: {} }
    const ReactModule = require('react')
    const ReactDOMModule = require('react-dom')
    const React = ReactModule.default?.createElement
      ? Object.assign({}, ReactModule.default, ReactModule)
      : ReactModule
    const createPortal = ReactDOMModule.createPortal ?? ReactDOMModule.default?.createPortal
    const h = React.createElement
    const { useEffect, useState } = React

    const STYLE_ID = '@liang/dsh-workbench-home'
    const HOME_HASH = '#home'
    const WORKBENCH_HASH = '#workbench'
    const CARD_CHANGE_EVENT = 'dsh-home:cards-changed'
    const cards = new Map()

    const styles = String.raw`
      [data-dsh-home-root] {
        --home-ink: #182033;
        --home-muted: #697386;
        --home-faint: #8a94a6;
        --home-canvas: #f3f6fb;
        --home-surface: #ffffff;
        --home-surface-hover: #fcfdff;
        --home-line: rgba(24, 32, 51, .10);
        --home-line-strong: rgba(24, 32, 51, .16);
        --home-accent: #5367e8;
        --home-accent-soft: rgba(83, 103, 232, .10);
        --home-success: #17805f;
        --home-warning: #c07a13;
        position: fixed;
        inset: 0;
        z-index: 2147482000;
        min-width: 280px;
        overflow: auto;
        box-sizing: border-box;
        color: var(--home-ink);
        background:
          radial-gradient(circle at 50% 34%, rgba(108, 126, 234, .08), transparent 28rem),
          var(--home-canvas);
        font-family: "Segoe UI Variable", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif;
      }
      body[data-ds-dark-theme] [data-dsh-home-root] {
        --home-ink: #f2f4f8;
        --home-muted: #aeb7c8;
        --home-faint: #818ca1;
        --home-canvas: #0f1421;
        --home-surface: #181f2f;
        --home-surface-hover: #1c2436;
        --home-line: rgba(235, 240, 255, .10);
        --home-line-strong: rgba(235, 240, 255, .17);
        --home-accent: #7183f4;
        --home-accent-soft: rgba(113, 131, 244, .14);
        --home-success: #58c69e;
        --home-warning: #e3a84c;
      }
      .dsh-home__shell {
        width: min(1040px, calc(100vw - 40px));
        min-height: 100dvh;
        display: grid;
        place-items: center;
        margin: 0 auto;
        padding: clamp(48px, 10vh, 96px) 0;
        box-sizing: border-box;
      }
      .dsh-home__launcher {
        width: 100%;
        transition: max-width 220ms cubic-bezier(.2, 0, 0, 1);
      }
      .dsh-home__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
        gap: 16px;
      }
      .dsh-home-card {
        --card-accent: var(--home-accent);
        --card-accent-soft: var(--home-accent-soft);
        width: 100%;
        min-width: 0;
        min-height: 190px;
        display: flex;
        flex-direction: column;
        padding: 21px;
        box-sizing: border-box;
        border: 1px solid var(--home-line);
        border-radius: 17px;
        color: inherit;
        background: var(--home-surface);
        box-shadow: 0 1px 2px rgba(25, 34, 58, .03), 0 12px 32px rgba(25, 34, 58, .07);
        font: inherit;
        text-align: left;
        cursor: pointer;
        animation: dsh-home-card-enter .34s calc(70ms + var(--card-order, 0) * 45ms) cubic-bezier(.2, 0, 0, 1) both;
        transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, transform 160ms ease;
      }
      .dsh-home-card[data-tone="green"] {
        --card-accent: #14936b;
        --card-accent-soft: rgba(20, 147, 107, .11);
      }
      .dsh-home-card[data-tone="blue"] {
        --card-accent: #1683c5;
        --card-accent-soft: rgba(22, 131, 197, .11);
      }
      .dsh-home-card:hover {
        border-color: color-mix(in srgb, var(--card-accent) 38%, transparent);
        background: var(--home-surface-hover);
        box-shadow: 0 2px 5px rgba(25, 34, 58, .04), 0 18px 42px rgba(25, 34, 58, .11);
        transform: translateY(-2px);
      }
      .dsh-home-card:active { transform: scale(.98); }
      .dsh-home-card:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--card-accent) 30%, transparent);
        outline-offset: 3px;
      }
      .dsh-home-card:disabled {
        opacity: .58;
        cursor: not-allowed;
        box-shadow: none;
        transform: none;
      }
      .dsh-home-card__top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }
      .dsh-home-card__icon {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 12px;
        color: var(--card-accent);
        background: var(--card-accent-soft);
        font-size: 17px;
        font-weight: 720;
      }
      .dsh-home-card__status {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-height: 26px;
        padding: 0 9px;
        border-radius: 999px;
        color: var(--home-muted);
        background: color-mix(in srgb, var(--home-ink) 4%, transparent);
        font-size: 11px;
      }
      .dsh-home-card__status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--home-faint);
      }
      .dsh-home-card__status[data-state="ready"] .dsh-home-card__status-dot { background: var(--home-success); }
      .dsh-home-card__status[data-state="offline"] .dsh-home-card__status-dot { background: var(--home-warning); }
      .dsh-home-card__status[data-state="loading"] .dsh-home-card__status-dot { animation: dsh-home-pulse 1.15s ease-in-out infinite; }
      .dsh-home-card__title {
        display: block;
        margin-top: 18px;
        font-size: 18px;
        font-weight: 670;
        letter-spacing: -.02em;
      }
      .dsh-home-card__description {
        display: block;
        margin-top: 6px;
        color: var(--home-muted);
        font-size: 12px;
        line-height: 1.6;
      }
      .dsh-home-card__action {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: auto;
        padding-top: 18px;
        color: var(--card-accent);
        font-size: 12px;
        font-weight: 650;
      }
      .dsh-home-card__arrow {
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        border-radius: 9px;
        background: var(--card-accent-soft);
        font-size: 15px;
        transition: background 160ms ease, transform 160ms ease;
      }
      .dsh-home-card:hover .dsh-home-card__arrow { background: color-mix(in srgb, var(--card-accent) 16%, transparent); transform: translateX(2px); }
      .dsh-home-nav {
        min-width: 36px;
        min-height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        padding: 0 10px;
        border: 0;
        border-radius: 9px;
        color: var(--dsw-alias-label-secondary, #667085);
        background: transparent;
        font: inherit;
        font-size: 12px;
        cursor: pointer;
        transition: color 150ms ease, background 150ms ease, transform 150ms ease;
      }
      .dsh-home-nav:hover {
        color: var(--dsw-alias-label-primary, #172033);
        background: var(--dsw-alias-interactive-bg-hover, rgba(91, 103, 241, .09));
        transform: translateY(-1px);
      }
      .dsh-home-nav:active { transform: scale(.97); }
      .dsh-home-nav:focus-visible {
        outline: 2px solid var(--dsw-alias-state-business-primary, #5b67f1);
        outline-offset: 2px;
      }
      .dsh-home-nav__icon { font-size: 16px; }
      @keyframes dsh-home-card-enter {
        from { opacity: 0; transform: translateY(10px) scale(.985); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes dsh-home-pulse {
        50% { opacity: .35; transform: scale(.82); }
      }
      @media (prefers-reduced-motion: reduce) {
        [data-dsh-home-root] *, [data-dsh-home-root] *::before, [data-dsh-home-root] *::after {
          animation-duration: .01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: .01ms !important;
        }
      }
    `

    function installStyles() {
      if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`)) return () => {}
      const tag = document.createElement('style')
      tag.dataset.plugin = STYLE_ID
      tag.dataset.pluginCss = STYLE_ID
      tag.textContent = styles
      document.head.appendChild(tag)
      return () => tag.remove()
    }

    function isHomeRoute() {
      return !window.location.hash || window.location.hash === HOME_HASH
    }

    function openHome() {
      if (window.location.hash !== HOME_HASH) window.location.hash = HOME_HASH
      else window.dispatchEvent(new HashChangeEvent('hashchange'))
    }

    function openRoute(hash) {
      if (typeof hash !== 'string' || !hash.startsWith('#')) return
      if (window.location.hash !== hash) window.location.hash = hash
      else window.dispatchEvent(new HashChangeEvent('hashchange'))
    }

    function normalizeCard(card) {
      if (!card || typeof card.id !== 'string' || !card.id.trim()) {
        throw new TypeError('DSH home card requires a non-empty id')
      }
      if (typeof card.title !== 'string' || !card.title.trim()) {
        throw new TypeError(`DSH home card "${card.id}" requires a title`)
      }
      return {
        id: card.id.trim(),
        title: card.title.trim(),
        description: String(card.description || ''),
        icon: String(card.icon || '·'),
        hash: String(card.hash || HOME_HASH),
        action: String(card.action || '打开'),
        status: String(card.status || ''),
        state: ['ready', 'loading', 'offline'].includes(card.state) ? card.state : 'offline',
        tone: ['indigo', 'green', 'blue'].includes(card.tone) ? card.tone : 'indigo',
        order: Number.isFinite(card.order) ? card.order : 100,
        disabled: card.disabled === true,
      }
    }

    function listCards() {
      return [...cards.values()].sort((left, right) => left.order - right.order || left.title.localeCompare(right.title))
    }

    function emitCardsChanged() {
      window.dispatchEvent(new CustomEvent(CARD_CHANGE_EVENT))
    }

    function registerCard(value) {
      const card = normalizeCard(value)
      cards.set(card.id, card)
      emitCardsChanged()
      return () => {
        if (cards.get(card.id) !== card) return
        cards.delete(card.id)
        emitCardsChanged()
      }
    }

    const homeApi = Object.freeze({ registerCard, listCards })
    window.__DSH_HOME__ = homeApi

    function useHomeCards() {
      const [items, setItems] = useState(listCards)
      useEffect(() => {
        const refresh = () => setItems(listCards())
        window.addEventListener(CARD_CHANGE_EVENT, refresh)
        refresh()
        return () => window.removeEventListener(CARD_CHANGE_EVENT, refresh)
      }, [])
      return items
    }

    function HomeCard({ card, index }) {
      return h('button', {
        type: 'button',
        className: 'dsh-home-card',
        'data-tone': card.tone,
        disabled: card.disabled,
        onClick: () => openRoute(card.hash),
        style: { '--card-order': index },
      },
      h('span', { className: 'dsh-home-card__top' },
        h('span', { className: 'dsh-home-card__icon', 'aria-hidden': true }, card.icon),
        card.status
          ? h('span', { className: 'dsh-home-card__status', 'data-state': card.state },
              h('span', { className: 'dsh-home-card__status-dot', 'aria-hidden': true }),
              h('span', null, card.status),
            )
          : null,
      ),
      h('span', { className: 'dsh-home-card__title' }, card.title),
      h('span', { className: 'dsh-home-card__description' }, card.description),
      h('span', { className: 'dsh-home-card__action' },
        h('span', null, card.action),
        h('span', { className: 'dsh-home-card__arrow', 'aria-hidden': true }, '→'),
      ),
      )
    }

    function HomeGate() {
      const [visible, setVisible] = useState(isHomeRoute)
      const items = useHomeCards()

      useEffect(() => {
        const onHash = () => setVisible(isHomeRoute())
        window.addEventListener('hashchange', onHash)
        return () => window.removeEventListener('hashchange', onHash)
      }, [])

      if (!visible) return null

      const page = h('main', {
        'data-dsh-home-root': '',
        'aria-label': 'DSH 首页',
      },
      h('div', { className: 'dsh-home__shell' },
        h('div', {
          className: 'dsh-home__launcher',
          style: { maxWidth: `${Math.min(Math.max(items.length, 1), 3) * 320 + Math.max(Math.min(items.length, 3) - 1, 0) * 16}px` },
        },
          h('section', { className: 'dsh-home__grid', 'aria-label': '应用入口' },
            items.map((card, index) => h(HomeCard, { key: card.id, card, index })),
          ),
        ),
      ))

      return createPortal ? createPortal(page, document.body) : page
    }

    function HomeNavigation(props) {
      return h('button', {
        type: 'button',
        className: 'dsh-home-nav',
        title: '返回首页',
        'aria-label': '返回首页',
        onClick: props.openHome,
      },
      h('span', { className: 'dsh-home-nav__icon', 'aria-hidden': true }, '⌂'),
      props.wide === false ? null : h('span', null, '首页'),
      )
    }

    const inject = ['slots']

    function apply(ctx) {
      ctx.effect(installStyles, 'workbench-home: styles')
      ctx.effect(() => registerCard({
        id: 'workbench',
        title: '工作台',
        description: '代码、终端与 Git，都在这里。',
        icon: '⌘',
        hash: WORKBENCH_HASH,
        action: '进入工作台',
        status: '可用',
        state: 'ready',
        tone: 'indigo',
        order: 10,
      }), 'workbench-home: workbench card')
      ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
        name: 'conversation.input.overlay',
        id: 'workbench-home',
      }, HomeGate))
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'workbench-home',
        order: 80,
        inject: () => ({ openHome }),
      }, HomeNavigation))
    }

    module.exports = { inject, apply }
    return module.exports
  },
})
