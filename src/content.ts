// IIFE isolates all declarations from Rakuten's global scope to avoid name collisions.
(function () {
  'use strict';

  interface ImageData {
    src: string;
    alt: string;
  }

  // =========================================================
  // Image collection
  // =========================================================

  /**
   * Returns the highest-resolution URL for an image element.
   * Prefers the widest `w`-descriptor candidate from `srcset`; falls back to
   * stripping all query parameters from `src`.
   * @param img - The image element to inspect.
   * @returns The best available URL string.
   */
  function getBestSrc(img: HTMLImageElement): string {
    if (img.srcset) {
      // Only keep width descriptors (e.g. "500w"). Density descriptors ("2x") pass
      // the length check but parseInt gives 2, corrupting the max-width comparison.
      const candidates = img.srcset
        .split(',')
        .map((s) => s.trim().split(/\s+/))
        .filter((p) => p.length >= 2 && p[1].endsWith('w'));
      if (candidates.length) {
        const best = candidates.reduce((a, b) => (parseInt(a[1]) >= parseInt(b[1]) ? a : b));
        return best[0];
      }
    }
    // Strip all query params (e.g. ?_ex=600x600) to get the original full-resolution image.
    return img.src.replace(/\?.*$/, '');
  }

  /**
   * Collects product images from Rakuten's standard layout (`image-wrapper--` elements).
   * @returns An array of `ImageData` with at least 3 entries, or `null` if the layout
   *   is not present or has too few images.
   */
  function getImagesFromWrappers(): ImageData[] | null {
    const wrappers = document.querySelectorAll<HTMLElement>('[class*="image-wrapper--"]');
    if (wrappers.length < 3) return null;
    // Multiple wrappers can reference the same image URL; deduplicate by src.
    const seen = new Set<string>();
    const images: ImageData[] = [];
    wrappers.forEach((w) => {
      w.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
        if (img.src.startsWith('http') && !seen.has(img.src)) {
          seen.add(img.src);
          images.push({ src: getBestSrc(img), alt: img.alt || '' });
        }
      });
    });
    return images.length >= 3 ? images : null;
  }

  /**
   * Collects product images from shops using the custom `.sale_desc` layout.
   * @returns An array of `ImageData` with at least 2 entries, or `null` if `.sale_desc`
   *   is absent or has too few images.
   */
  function getImagesFromSaleDesc(): ImageData[] | null {
    const saleDesc = document.querySelector('.sale_desc');
    if (!saleDesc) return null;
    const images: ImageData[] = [];
    saleDesc.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      if (img.src.startsWith('http')) {
        images.push({ src: getBestSrc(img), alt: img.alt || '' });
      }
    });
    return images.length >= 2 ? images : null;
  }

  // =========================================================
  // Slideshow
  // =========================================================

  /**
   * Builds and returns a slideshow element for the given images.
   * Includes a main view with prev/next buttons, a counter, a loading spinner,
   * a thumbnail strip, and a lightbox overlay appended to `document.body`.
   * @param images - Ordered list of images to display.
   * @returns The root `div.sre-slideshow` element.
   */
  function createSlideshow(images: ImageData[]): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'sre-slideshow';

    const mainView = document.createElement('div');
    mainView.className = 'sre-main-view';

    const mainImg = document.createElement('img');
    mainImg.className = 'sre-main-img';

    const counter = document.createElement('div');
    counter.className = 'sre-counter';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'sre-btn sre-prev';
    prevBtn.innerHTML = '&#10094;';
    prevBtn.setAttribute('aria-label', '前の画像');

    const nextBtn = document.createElement('button');
    nextBtn.className = 'sre-btn sre-next';
    nextBtn.innerHTML = '&#10095;';
    nextBtn.setAttribute('aria-label', '次の画像');

    const spinner = document.createElement('div');
    spinner.className = 'sre-spinner';

    mainView.appendChild(mainImg);
    mainView.appendChild(spinner);
    mainView.appendChild(prevBtn);
    mainView.appendChild(nextBtn);
    mainView.appendChild(counter);

    for (const ev of ['load', 'error'] as const) {
      mainImg.addEventListener(ev, () => spinner.classList.remove('sre-spinner-visible'));
    }

    const thumbStrip = document.createElement('div');
    thumbStrip.className = 'sre-thumbs';

    const thumbEls: HTMLImageElement[] = images.map((data, i) => {
      const thumb = document.createElement('img');
      thumb.className = 'sre-thumb';
      thumb.src = data.src;
      thumb.alt = data.alt;
      thumb.dataset.index = String(i);
      thumbStrip.appendChild(thumb);
      return thumb;
    });

    container.appendChild(mainView);
    container.appendChild(thumbStrip);

    let current = 0;

    /**
     * Navigates to the image at the given index, wrapping around at the boundaries.
     * Updates the main image, counter, thumbnail highlight, and thumbnail scroll position.
     * @param index - Target index (may be negative or out of range; wrapping is applied).
     */
    function goTo(index: number): void {
      current = (index + images.length) % images.length;
      spinner.classList.add('sre-spinner-visible');
      mainImg.src = images[current].src;
      mainImg.alt = images[current].alt;
      counter.textContent = `${current + 1} / ${images.length}`;

      thumbEls.forEach((t, i) => t.classList.toggle('sre-thumb-active', i === current));

      // Use getBoundingClientRect instead of offsetLeft because offsetLeft is relative
      // to offsetParent, which may not be thumbStrip. BoundingClientRect gives
      // viewport-relative positions that remain accurate regardless of DOM nesting.
      // scrollIntoView is intentionally avoided — it propagates up the ancestor chain
      // and causes erratic scroll behavior when wrapping between first and last images.
      const active = thumbEls[current];
      const stripRect = thumbStrip.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const targetLeft =
        thumbStrip.scrollLeft + activeRect.left - stripRect.left -
        thumbStrip.clientWidth / 2 + active.clientWidth / 2;
      thumbStrip.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }

    const lightbox = document.createElement('div');
    lightbox.className = 'sre-lightbox';
    const lightboxImg = document.createElement('img');
    lightboxImg.className = 'sre-lightbox-img';
    lightbox.appendChild(lightboxImg);
    document.body.appendChild(lightbox);

    const rakutenHeader = document.getElementById('rakutenLimitedId_header');
    const chatWidget = document.getElementById('chat_widget');

    /** Shows the lightbox with the current image and hides competing fixed elements. */
    function openLightbox(): void {
      // The header's children are position:fixed, so they escape the parent's stacking
      // context and z-index alone cannot push them behind the overlay. display:none is
      // the only reliable way to hide the header while the lightbox is open.
      if (rakutenHeader) rakutenHeader.style.display = 'none';
      if (chatWidget) chatWidget.style.setProperty('z-index', '-1', 'important');
      lightboxImg.src = images[current].src;
      lightbox.classList.add('sre-lightbox-open');
    }

    /** Hides the lightbox and restores the previously hidden elements. */
    function closeLightbox(): void {
      if (rakutenHeader) rakutenHeader.style.display = '';
      if (chatWidget) chatWidget.style.removeProperty('z-index');
      lightbox.classList.remove('sre-lightbox-open');
    }

    mainImg.style.cursor = 'zoom-in';
    mainImg.addEventListener('click', openLightbox);
    lightbox.addEventListener('click', closeLightbox);

    goTo(0);

    prevBtn.addEventListener('click', () => goTo(current - 1));
    nextBtn.addEventListener('click', () => goTo(current + 1));
    thumbStrip.addEventListener('click', (e) => {
      const thumb = (e.target as HTMLElement).closest<HTMLElement>('.sre-thumb');
      if (thumb?.dataset.index !== undefined) goTo(parseInt(thumb.dataset.index, 10));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') goTo(current - 1);
      else if (e.key === 'ArrowRight') goTo(current + 1);
      else if (e.key === 'Escape') closeLightbox();
    });

    return container;
  }

  // =========================================================
  // Page rebuild
  // =========================================================

  /**
   * Walks up the DOM from `el1` and returns the first ancestor that also contains `el2`.
   * Returns `document.body` if no such ancestor exists below the body.
   * @param el1 - The element whose ancestors are traversed.
   * @param el2 - The element to search for within each ancestor.
   * @returns The nearest common ancestor element.
   */
  function nearestCommonAncestor(el1: Element, el2: Element): Element {
    let a = el1.parentElement;
    while (a && a !== document.body) {
      if (a.contains(el2)) return a;
      a = a.parentElement;
    }
    return document.body;
  }

  /**
   * Locates the purchase section (cart + options) to be moved into the new layout.
   * When both cart elements exist, returns their nearest common ancestor unless that
   * ancestor is `pagebody` or `body`, in which case `aroundCart` is returned directly.
   * @param pagebody - The `#pagebody` element, used as an upper boundary sentinel.
   * @returns The purchase section element, or `null` if no cart elements are found.
   */
  function findPurchaseSection(pagebody: HTMLElement): Element | null {
    const cartEl = document.getElementById('rakutenLimitedId_aroundCart');
    const cartTable = document.getElementById('rakutenLimitedId_cart');

    if (!cartEl && !cartTable) return null;
    if (!cartEl) return cartTable;
    if (!cartTable) return cartEl;

    const nca = nearestCommonAncestor(cartEl, cartTable);
    // When both cart elements are direct children of pagebody (the common layout),
    // the NCA is pagebody itself. Return the outer cart element instead so we don't
    // move the entire pagebody into the new wrapper.
    if (nca === document.body || nca === pagebody) return cartEl;
    return nca;
  }

  /**
   * Creates an anchor element linking to the shop's top page.
   * The shop ID is extracted from the first path segment of the current URL.
   * @returns The `a.sre-shop-link` element.
   */
  function createShopLink(): HTMLAnchorElement {
    const shopId = window.location.pathname.split('/')[1];
    const link = document.createElement('a');
    link.className = 'sre-shop-link';
    link.href = `https://item.rakuten.co.jp/${shopId}/`;
    link.textContent = `${shopId} ショップ`;
    return link;
  }

  /**
   * Inserts `#sre-page` (shop link, slideshow, purchase section) just before `#pagebody`,
   * then leaves `#pagebody` visible so the original page content appears below.
   * Attaches a `ResizeObserver` to keep the slideshow width in sync with the
   * purchase section width.
   * @param slideshow - The slideshow element produced by `createSlideshow`.
   */
  function rebuildPage(slideshow: HTMLDivElement): void {
    const pagebody = document.getElementById('pagebody');
    if (!pagebody) return;

    const purchaseSection = findPurchaseSection(pagebody);
    const wrapper = document.createElement('div');
    wrapper.id = 'sre-page';

    wrapper.appendChild(createShopLink());
    wrapper.appendChild(slideshow);

    if (purchaseSection) {
      purchaseSection.querySelectorAll<HTMLElement>('.sale_desc').forEach((el) => {
        el.style.display = 'none';
      });
      // Move (not clone) the node to preserve Rakuten's JS event handlers on it.
      wrapper.appendChild(purchaseSection);
    }

    // Insert before pagebody so #sre-page appears at the top, pagebody follows below.
    pagebody.insertAdjacentElement('beforebegin', wrapper);

    // instanceof HTMLElement is required because findPurchaseSection returns Element,
    // and offsetWidth only exists on HTMLElement.
    if (purchaseSection instanceof HTMLElement) {
      const syncWidth = () => {
        slideshow.style.maxWidth = purchaseSection.offsetWidth + 'px';
      };
      syncWidth();
      new ResizeObserver(syncWidth).observe(purchaseSection);
    }
  }

  // =========================================================
  // Entry point
  // =========================================================

  /**
   * Collects images from the page and rebuilds the layout as a slideshow.
   * Tries the standard wrapper layout first, then falls back to `.sale_desc`.
   * Exits silently if neither source yields enough images.
   */
  function init(): void {
    const images = getImagesFromWrappers() || getImagesFromSaleDesc();
    if (!images) return;

    const slideshow = createSlideshow(images);
    rebuildPage(slideshow);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
