
  window.vaadin = window.vaadin || {};
  vaadin.elements = vaadin.elements || {};
  vaadin.elements.grid = vaadin.elements.grid || {};

  /**
   * @polymerBehavior vaadin.elements.grid.TableScrollBehaviorImpl
   */
  vaadin.elements.grid.TableScrollBehaviorImpl = {

    properties: {

      _vidxOffset: {
        type: Number,
        value: 0
      },

      ios: {
        type: Boolean,
        value: navigator.userAgent.match(/iP(?:hone|ad;(?: U;)? CPU) OS (\d+)/),
        reflectToAttribute: true
      },

      fixedSections: {
        type: Boolean,
        reflectToAttribute: true,
        computed: '_hasFixedSections(scrollbarWidth)'
      },

      // Cached array of frozen cells
      _frozenCells: {
        type: Array,
        value: function() {
          return [];
        }
      },

      scrolling: {
        type: Boolean,
        reflectToAttribute: true
      }
    },

    listeners: {
      'table.wheel': '_onWheel'
    },

    ready: function() {
      this.scrollTarget = this.$.table;
    },

    /**
     * Scroll to a specific index (also scaled indexes) in the virtual list.
     */
    scrollToScaledIndex: function(idx) {
      this._pendingScrollToScaledIndex = null;
      if (!this.$.items.style.borderTopWidth) {
        // Schedule another scroll to be invoked once init is complete
        this._pendingScrollToScaledIndex = idx;
      }

      idx = Math.min(Math.max(idx, 0), this.size - 1);
      this.$.table.scrollTop = idx / this.size * this.$.table.scrollHeight;
      this._scrollHandler();
      this.scrollToIndex(idx - this._vidxOffset);
      // _scrollTop is not up-to-date at this point, update and run scrollhandler
      this._resetScrollPosition(this._scrollPosition);
      this._scrollHandler();

      // TODO: This is a hack to get around offset issues when scrolling to bottom.
      // Revisit iron-list-behavior for cleaner fix.
      if (this._vidxOffset + this.lastVisibleIndex === this.size - 1) {
        this.$.table.scrollTop = this.$.table.scrollHeight - this.$.table.offsetHeight;
        this._scrollHandler();
      }
    },

    _hasFixedSections: function(scrollbarWidth) {
      return navigator.userAgent.match(/Edge/) && scrollbarWidth === 0;
    },

    _onWheel: function(e) {
      if (e.ctrlKey || this._hasScrolledAncestor(e.target, e.deltaX, e.deltaY)) {
        return;
      }

      var table = this.$.table;
      var momentum = Math.abs(e.deltaX) + Math.abs(e.deltaY);

      if (this._canScroll(table, e.deltaX, e.deltaY)) {
        e.preventDefault();
        table.scrollTop += e.deltaY;
        table.scrollLeft += e.deltaX;
        this._scrollHandler();
        this._hasResidualMomentum = true;

        this._ignoreNewWheel = this.debounce('ignore-new-wheel', function() {
          this._ignoreNewWheel = null;
        }, 500);
      } else if (this._hasResidualMomentum && momentum <= this._previousMomentum || this._ignoreNewWheel) {
        e.preventDefault();
      } else if (momentum > this._previousMomentum) {
        this._hasResidualMomentum = false;
      }
      this._previousMomentum = momentum;
    },

    /**
     * Determines if the element has an ancestor prior to this
     * cell content that handles the scroll delta
     */
    _hasScrolledAncestor: function(el, deltaX, deltaY) {
      if (this._canScroll(el, deltaX, deltaY)) {
        return true;
      } else if (el.localName !== 'vaadin-grid-cell-content' && el !== this && el.parentElement) {
        return this._hasScrolledAncestor(el.parentElement, deltaX, deltaY);
      }
    },

    /**
     * Determines if the the given scroll deltas can be applied to the element
     * (fully or partially)
     */
    _canScroll: function(el, deltaX, deltaY) {
      return (deltaY > 0 && el.scrollTop < el.scrollHeight - el.offsetHeight) ||
      (deltaY < 0 && el.scrollTop > 0) ||
      (deltaX > 0 && el.scrollLeft < el.scrollWidth - el.offsetWidth) ||
      (deltaX < 0 && el.scrollLeft > 0);
    },

    /**
     * Update the models, the position of the
     * items in the viewport and recycle tiles as needed.
     */
    _scrollHandler: function(e) {
      // clamp the `scrollTop` value
      var scrollTop = Math.max(0, Math.min(this._maxScrollTop, this._scrollTop));
      var delta = scrollTop - this._scrollPosition;
      var tileHeight, kth, recycledTileSet, scrollBottom, physicalBottom;
      var ratio = this._ratio;
      var recycledTiles = 0;
      var hiddenContentSize = this._hiddenContentSize;
      var currentRatio = ratio;
      var movingUp = [];

      // track the last `scrollTop`
      this._scrollPosition = scrollTop;

      // clear cached visible indexes
      this._firstVisibleIndexVal = null;
      this._lastVisibleIndexVal = null;

      scrollBottom = this._scrollBottom;
      physicalBottom = this._physicalBottom;

      // random access
      if (Math.abs(delta) > this._physicalSize) {
        this._physicalTop += delta;
        recycledTiles = Math.round(delta / this._physicalAverage);
      // scroll up
      } else if (delta < 0) {
        var topSpace = scrollTop - this._physicalTop;
        var virtualStart = this._virtualStart;

        recycledTileSet = [];

        kth = this._physicalEnd;
        currentRatio = topSpace / hiddenContentSize;

        // move tiles from bottom to top
        while (
            // approximate `currentRatio` to `ratio`
            currentRatio < ratio &&
            // recycle less physical items than the total
            recycledTiles < this._physicalCount &&
            // ensure that these recycled tiles are needed
            virtualStart - recycledTiles > 0 &&
            // ensure that the tile is not visible
            physicalBottom - this._getPhysicalSizeIncrement(kth) > scrollBottom
        ) {

          tileHeight = this._getPhysicalSizeIncrement(kth);
          currentRatio += tileHeight / hiddenContentSize;
          physicalBottom -= tileHeight;
          recycledTileSet.push(kth);
          recycledTiles++;
          kth = (kth === 0) ? this._physicalCount - 1 : kth - 1;
        }

        movingUp = recycledTileSet;
        recycledTiles = -recycledTiles;
      // scroll down
      } else if (delta > 0) {
        var bottomSpace = physicalBottom - scrollBottom;
        var virtualEnd = this._virtualEnd;
        var lastVirtualItemIndex = this._virtualCount - 1;

        recycledTileSet = [];

        kth = this._physicalStart;
        currentRatio = bottomSpace / hiddenContentSize;

        // move tiles from top to bottom
        while (
            // approximate `currentRatio` to `ratio`
            currentRatio < ratio &&
            // recycle less physical items than the total
            recycledTiles < this._physicalCount &&
            // ensure that these recycled tiles are needed
            virtualEnd + recycledTiles < lastVirtualItemIndex &&
            // ensure that the tile is not visible
            this._physicalTop + this._getPhysicalSizeIncrement(kth) < scrollTop
          ) {

          tileHeight = this._getPhysicalSizeIncrement(kth);
          currentRatio += tileHeight / hiddenContentSize;

          this._physicalTop += tileHeight;
          recycledTileSet.push(kth);
          recycledTiles++;
          kth = (kth + 1) % this._physicalCount;
        }
      }

      if (this._virtualCount < this.size) {
        this._adjustVirtualIndexOffset(delta);
      }

      if (recycledTiles === 0) {
        // Try to increase the pool if the list's client height isn't filled up with physical items
        if (physicalBottom < scrollBottom || this._physicalTop > scrollTop) {
          this._increasePoolIfNeeded();
        }
      } else {
        this._virtualStart = this._virtualStart + recycledTiles;
        this._physicalStart = this._physicalStart + recycledTiles;
        this._update(recycledTileSet, movingUp);
      }

      this._translateStationaryElements();

      if (!this.hasAttribute('reordering')) {
        this.scrolling = true;
      }
      this.debounce('vaadin-grid-scrolling', function() {
        this.scrolling = false;
        this._reorderRows();
      }, 100);
    },

    _adjustVirtualIndexOffset: function(delta) {
      if (Math.abs(delta) > 10000) {
        if (this._noScale) {
          this._noScale = false;
          return;
        }

        var scale = Math.round(this._scrollPosition / this._scrollHeight * 1000) / 1000;
        var offset = scale * this.size;

        this._vidxOffset = Math.round(offset - scale * this._virtualCount);

        if (this._scrollTop === 0) {
          // fixes issues when scrolling to start but correct items are not bound. :-()
          this.scrollToIndex(0);
        }
      } else {
        // Make sure user can always swipe/wheel scroll to the start and end
        // TODO: causes a small jump in the scroll handle

        var oldOffset = this._vidxOffset || 0;
        var threshold = 1000;
        var maxShift = 100;

        // At start
        if (this._scrollTop === 0) {
          this._vidxOffset = 0;
          if (oldOffset !== this._vidxOffset) {
            this.scrollToIndex(0);
          }
        } else if (this.firstVisibleIndex < threshold && this._vidxOffset > 0) {
          this._vidxOffset -= Math.min(this._vidxOffset, maxShift);
          this.scrollToIndex(this.firstVisibleIndex + (oldOffset - this._vidxOffset) + 1);
          this._noScale = true;
        }

        // At end
        var maxOffset = this.size - this._virtualCount;
        if (this._scrollTop >= this._maxScrollTop) {
          this._vidxOffset = maxOffset;
          if (oldOffset !== this._vidxOffset) {
            this.scrollToIndex(this._virtualCount);
          }
        } else if (this.firstVisibleIndex > this._virtualCount - threshold && this._vidxOffset < maxOffset) {
          this._vidxOffset += Math.min(maxOffset - this._vidxOffset, maxShift);
          this.scrollToIndex(this.firstVisibleIndex - (this._vidxOffset - oldOffset));
          this._noScale = true;
        }

      }
    },

    _reorderRows: function() {
      var tbody = Polymer.dom(this.$.items);
      var items = tbody.querySelectorAll('tr');
      var _adjustedVirtualStart = this._virtualStart + this._vidxOffset;

      // DOM index of the element with the lowest index
      var physicalIndexOfFirst = items.length - (items[0].index - _adjustedVirtualStart);

      // Reorder the DOM elements
      if (physicalIndexOfFirst < items.length / 2) {
        // Append all the preceding elements after the last element
        for (var i = 0; i < physicalIndexOfFirst; i++) {
          tbody.appendChild(items[i]);
        }
      } else {
        // Prepend all the trailing elements before the first element
        for (var j = physicalIndexOfFirst; j < items.length; j++) {
          tbody.insertBefore(items[j], items[0]);
        }
      }
    },

    _frozenCellsChanged: function() {
      this.debounce('cache-elements', function() {
        Polymer.dom(this.root).querySelectorAll('td, th').forEach(function(cell) {
          cell.style.transform = '';
        });
        this._frozenCells = Polymer.dom(this.root).querySelectorAll('[frozen]');
        this._translateStationaryElements();
      });
      this._updateLastFrozen();
    },

    _updateLastFrozen: function() {
      if (!this.columnTree) {
        return;
      }
      var columnsRow = this.columnTree[this.columnTree.length - 1].slice(0);
      columnsRow.sort(function(a, b) {
        return a._order - b._order;
      });
      var lastFrozen = columnsRow.reduce(function(prev, col, index) {
        col._lastFrozen = false;
        return col.frozen && !col.hidden ? index : prev;
      }, undefined);
      if (lastFrozen !== undefined) {
        columnsRow[lastFrozen]._lastFrozen = true;
      }
    },

    _translateStationaryElements: function() {
      if (this.fixedSections) {
        this.$.items.style.transform =
        this._getTranslate(-this._scrollLeft || 0, -this._scrollTop || 0);

        this.$.footer.style.transform = this.$.header.style.transform =
        this._getTranslate(-this._scrollLeft || 0, 0);
      } else {
        this.$.footer.style.transform = this.$.header.style.transform = this._getTranslate(0, this._scrollTop);
      }

      var frozenCellTransform = this._getTranslate(this._scrollLeft, 0);
      for (var i = 0; i < this._frozenCells.length; i++) {
        this._frozenCells[i].style.transform = frozenCellTransform;
      }
    },

    _getTranslate: function(x, y) {
      return 'translate(' + x + 'px,' + y + 'px)';
    }

  };

  /**
   * @polymerBehavior vaadin.elements.grid.TableScrollBehavior
   */
  vaadin.elements.grid.TableScrollBehavior = [
    Polymer.IronScrollTargetBehavior,
    vaadin.elements.grid.TableScrollBehaviorImpl
  ];

