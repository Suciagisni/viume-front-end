let listenersAdded = false;

function createElement(tag, attributes) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  return element;
}

async function fetchImageData(xmlUrl, tileUrl, zoomLevel) {
  try {
    // To do: create authorization header from localStorage
    const headers = {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('accessToken'),
      },
    };

    const response = await fetch(xmlUrl, headers);
    const data = await response.json();
    data.tileUrl = tileUrl;
    data.zoomLevel = zoomLevel;
    return data;
  } catch (error) {
    console.error('Error fetching image data:', error);
    throw error;
  }
}

function setupOpenSeadragonViewer(info, data) {
  const tileSources = data.map((item) => ({
    type: 'zoomifytileservice',
    width: item.width,
    height: item.height,
    tilesUrl: item.tileUrl,
    tileSize: item.tile_size,
    zoomLevel: item.zoomLevel,
    fileFormat: 'jpg',
  }));
  console.log(tileSources);
  const viewer = OpenSeadragon({
    id: 'openseadragon-viewer',
    prefixUrl: 'https://viume.yarsi.ai/assets/icons/images/',
    showNavigator: true,
    toolbar: 'my-toolbar-container',
    tileSources: tileSources,
    sequenceMode: true,
    showRotationControl: true,
    showReferenceStrip: true,
    preserveViewport: true,
    navigatorBorderColor: 'transparent',
    gestureSettingsTouch: {
      pinchRotate: true,
    },

    crossOriginPolicy: 'Anonymous',
  });

  viewer.screenshot({
    showOptions: true,
    keyboardShortcut: 'p',
    showScreenshotControl: true,
  });

  viewer.scalebar({
    type: OpenSeadragon.ScalebarType.MICROSCOPE,
    pixelsPerMeter:
      (viewer.tileSources[viewer.currentPage()].width * viewer.tileSources[viewer.currentPage()].height) / 0.1,
    minWidth: '150px',
    location: OpenSeadragon.ScalebarLocation.BOTTOM_RIGHT,
    xOffset: 5,
    yOffset: 10,
    stayInsideImage: true,
    color: 'rgb(150, 150, 150)',
    fontColor: '#fff',
    backgroundColor: 'rgba(32, 101, 209, 0.5)',
    barThickness: 4,
  });

  return viewer;
}

function createSwitchButton(viewer, info, anno, defaultB) {
  const switchButton = createElement('button', {
    class: 'ai-button',
    style: 'position: fixed; right: 40px; bottom: 150px; z-index: 1000; display: none;',
  });
  const img = createElement('img', {
    src: 'https://viume.yarsi.ai/assets/icons/show_rest.png',
    width: '50',
    height: '50',
  });

  const hoverImgSrc = 'https://viume.yarsi.ai/assets/icons/show_hover.png';
  const pressedImgSrc = 'https://viume.yarsi.ai/assets/icons/show_pressed.png';

  switchButton.addEventListener('mouseenter', () => {
    img.src = hoverImgSrc;
  });

  switchButton.addEventListener('mousedown', () => {
    img.src = pressedImgSrc;
  });

  switchButton.addEventListener('mouseleave', () => {
    img.src = 'https://viume.yarsi.ai/assets/icons/show_rest.png';
  });

  switchButton.appendChild(img);

  switchButton.addEventListener('click', () => {
    const annotationsToToggle = document.querySelectorAll('.a9s-annotation.predict');
    annotationsToToggle.forEach((annotation) => {
      annotation.style.display = defaultB ? 'none' : 'inline';
    });

    defaultB = !defaultB;
  });

  return switchButton;
}

function createVerticalSlider(viewer) {
  const slider = document.createElement('input');
  slider.className = 'zoom-button';
  slider.type = 'range';
  slider.defaultValue = 1;
  slider.setAttribute('orient', 'vertical');
  slider.style.display = 'none';
  slider.style.webkitAppearance = 'slider-vertical';
  slider.style.width = '8px';
  slider.style.height = '175px';
  slider.style.padding = '0 5px';
  slider.style.position = 'fixed';
  slider.style.left = '10px';
  slider.style.top = '160px';
  slider.style.zIndex = 999;

  slider.min = 0.01;
  slider.max = 1;
  slider.step = 0.01;

  slider.addEventListener('input', function () {
    const value = parseFloat(slider.value);
    viewer.viewport.zoomTo(viewer.viewport.imageToViewportZoom(value));
  });

  viewer.addHandler('animation', function (event) {
    const zoomValue = viewer.viewport.viewportToImageZoom(event.eventSource.viewport.getZoom(true));
    slider.value = zoomValue.toFixed(2);
  });

  return slider;
}

function createFilterSlider(viewer) {
  const slider = document.createElement('input');
  slider.className = 'filter-button';
  slider.type = 'range';
  slider.defaultValue = 1;
  slider.setAttribute('orient', 'vertical');
  slider.style.display = 'none';
  slider.style.webkitAppearance = 'slider-vertical';
  slider.style.width = '8px';
  slider.style.height = '175px';
  slider.style.padding = '0 5px';
  slider.style.position = 'fixed';
  slider.style.left = '90px';
  slider.style.top = '160px';
  slider.style.zIndex = 999;

  slider.min = 0;
  slider.max = 4;
  slider.step = 0.1;

  const filterValueButton = createElement('button', {
    class: 'button filter-button',
    style:
      'position: fixed; width: 40px; height: 40px; border-radius: 50%; padding: 0; left: 120px; top: 160px; z-index: 1000; display: none;',
  });

  filterValueButton.textContent = slider.value;

  filterValueButton.addEventListener('click', () => {
    slider.value = 1;
    filterValueButton.textContent = slider.value;
    viewer.setFilterOptions({
      filters: {
        processors: OpenSeadragon.Filters.CONTRAST(slider.value),
      },
    });
  });

  slider.addEventListener('input', function () {
    filterValueButton.textContent = slider.value;
    viewer.setFilterOptions({
      filters: {
        processors: OpenSeadragon.Filters.CONTRAST(slider.value),
      },
    });
  });

  return { slider, filterValueButton };
}

function zoomTo10(viewer, info) {
  const zoomTo10Button = createElement('button', {
    class: 'button zoom-button',
    style:
      'position: fixed; width: 40px; height: 40px; border-radius: 50%; padding: 0; left: 40px; top: 280px; z-index: 1000; display: none;',
  });

  if (viewer.tileSources[viewer.currentPage()].zoomLevel) {
    zoomTo10Button.textContent = `${viewer.tileSources[viewer.currentPage()].zoomLevel / 10}x`;
  } else {
    zoomTo10Button.textContent = '10%';
  }

  zoomTo10Button.addEventListener('click', () => {
    viewer.viewport.zoomTo(viewer.viewport.imageToViewportZoom(0.1));
  });

  return zoomTo10Button;
}

function zoomTo50(viewer, info) {
  const zoomTo50Button = createElement('button', {
    class: 'button zoom-button',
    style:
      'position: fixed; width: 40px; height: 40px; border-radius: 50%; padding: 0; left: 40px; top: 225px; z-index: 1000; display: none;',
  });

  if (viewer.tileSources[viewer.currentPage()].zoomLevel) {
    zoomTo50Button.textContent = `${viewer.tileSources[viewer.currentPage()].zoomLevel / 2}x`;
  } else {
    zoomTo50Button.textContent = '50%';
  }

  zoomTo50Button.addEventListener('click', () => {
    viewer.viewport.zoomTo(viewer.viewport.imageToViewportZoom(0.5));
  });

  return zoomTo50Button;
}

function zoomTo100(viewer, info) {
  const zoomTo100Button = createElement('button', {
    class: 'button zoom-button',
    style:
      'position: fixed; width: 40px; height: 40px; border-radius: 50%; padding: 0; left: 40px; top: 170px; z-index: 1000; display: none;',
  });

  if (viewer.tileSources[viewer.currentPage()].zoomLevel) {
    zoomTo100Button.textContent = `${viewer.tileSources[viewer.currentPage()].zoomLevel}x`;
  } else {
    zoomTo100Button.textContent = '100%';
  }

  zoomTo100Button.addEventListener('click', () => {
    viewer.viewport.zoomTo(viewer.viewport.imageToViewportZoom(1));
  });

  return zoomTo100Button;
}

function downloadAnnotationButton(viewer, info, data) {
  const yoloButton = createElement('button', {
    class: 'ai-button',
    style: 'position: fixed; right: 40px; bottom: 100px; z-index: 10000; display: none;',
  });

  const img = createElement('img', {
    src: 'https://viume.yarsi.ai/assets/icons/export_rest.png',
    width: '50',
    height: '50',
  });

  const hoverImgSrc = 'https://viume.yarsi.ai/assets/icons/export_hover.png';
  const pressedImgSrc = 'https://viume.yarsi.ai/assets/icons/export_pressed.png';

  yoloButton.addEventListener('mouseenter', () => {
    img.src = hoverImgSrc;
  });

  yoloButton.addEventListener('mousedown', () => {
    img.src = pressedImgSrc;
  });

  yoloButton.addEventListener('mouseleave', () => {
    img.src = 'https://viume.yarsi.ai/assets/icons/export_rest.png';
  });

  yoloButton.appendChild(img);

  yoloButton.addEventListener('click', () => {
    const url = 'https://apiviu.ashoka-dashboard.com/annotation/yolo';

    var currentPageIndex = viewer.currentPage();
    var currentTileSource = viewer.tileSources[currentPageIndex];
    var currentTileSourceUrl = currentTileSource.tilesUrl;
    const requestData = {
      imageId: currentTileSourceUrl.split('/').reverse()[1],
      image_height: currentTileSource.height,
      image_width: currentTileSource.width,
    };

    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      'Content-Type': 'application/json',
    };

    fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok (${response.status} - ${response.statusText})`);
        }
        return response.json();
      })
      .then((data) => {
        console.log(data);
        const abnormalList = data.annotation.abnormal;
        const normalList = data.annotation.normal;
        const other = data.annotation.other;

        // Join the array elements with new lines
        const abnormalText = abnormalList.join('\n');
        const normalText = normalList.join('\n');
        const otherText = other.join('\n');

        // Combine the contents of abnormalText and normalText
        const mergedText = `${abnormalText}\n${normalText}\n${otherText}`;

        const mergedBlob = new Blob([mergedText], { type: 'text/plain;charset=utf-8' });

        saveAs(mergedBlob, `${info.data[0].xmlUrl.split('/').reverse()[0]}.txt`);
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  });

  return yoloButton;
}

function handleViewportChange(switchButton) {
  // Hover effect logic...
  switchButton.addEventListener('mouseover', () => {
    switchButton.style.backgroundColor = '#1A4DA1'; // Darker blue color
  });
  switchButton.addEventListener('mouseout', () => {
    switchButton.style.backgroundColor = '#2065D1'; // Blue color
  });
}

function hasPredictTag(annotation) {
  // Check if the annotation has a "predict" tag in its body
  return annotation.body.some(
    (body) => body.type === 'TextualBody' && body.purpose === 'tagging' && body.value.includes('predict')
  );
}

const saveAnnotations = (anno, viewer, currentTileSourceUrl) => {
  const annotations = anno.getAnnotations();
  fetch(`https://apiviu.ashoka-dashboard.com/annotation/${currentTileSourceUrl.split('/').reverse()[1]}`, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + localStorage.getItem('accessToken'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageId: currentTileSourceUrl.split('/').reverse()[1],
      listAnnotation: annotations,
      
    }),
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Network response was not ok (${res.status} - ${res.statusText})`);
      }
    })
    .catch((error) => {
      console.error('Error Updating annotations:', error);
    });
};

const fetchAndAddNewAnnotations = (anno, info, viewer) => {
  anno.clearAnnotations();
  var currentPageIndex = viewer.currentPage();
  var currentTileSource = viewer.tileSources[currentPageIndex];
  var currentTileSourceUrl = currentTileSource.tilesUrl;
  console.log(currentTileSourceUrl);
  fetch(`https://apiviu.ashoka-dashboard.com/annotation/${currentTileSourceUrl.split('/').reverse()[1]}`, {
    headers: {
      Authorization: 'Bearer ' + localStorage.getItem('accessToken'),
    },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Network response was not ok (${res.status} - ${res.statusText})`);
      }
      return res.json();
    })
    .then((data) => {
      let savedAnnotations = [];
      if (data.annotation) {
        savedAnnotations = data.annotation.listAnnotation;
      }
      // Assuming 'anno' is defined elsewhere
      savedAnnotations.forEach((annotation) => {
        anno.addAnnotation(annotation);
      });

      const annotationsToToggle = document.querySelectorAll('.a9s-annotation.predict');
      annotationsToToggle.forEach((annotation) => {
        // Toggle the display property between 'none' and 'inline'
        annotation.style.display = 'none';
      });

      if (!listenersAdded) {
        anno.on('createAnnotation', () =>
          saveAnnotations(anno, viewer, viewer.tileSources[viewer.currentPage()].tilesUrl)
        );
        anno.on('updateAnnotation', () =>
          saveAnnotations(anno, viewer, viewer.tileSources[viewer.currentPage()].tilesUrl)
        );
        anno.on('deleteAnnotation', () =>
          saveAnnotations(anno, viewer, viewer.tileSources[viewer.currentPage()].tilesUrl)
        );

        listenersAdded = true;
      }
    })
    .catch((error) => {
      console.error('Error fetching or processing annotations:', error);
    });
};

function createFloatingButton() {
  const floatingButton = createElement('button', {
    class: 'floating-button',
    style: `
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: transparent;
      border: none;
      cursor: pointer;
      z-index: 10000;
    `,
  });

  const img = createElement('img', {
    src: 'https://viume.yarsi.ai/assets/icons/ai_rest.png',
    width: '70',
    height: '70',
  });

  const hoverImgSrc = 'https://viume.yarsi.ai/assets/icons/ai_hover.png';
  const pressedImgSrc = 'https://viume.yarsi.ai/assets/icons/ai_pressed.png';

  floatingButton.addEventListener('mouseenter', () => {
    img.src = hoverImgSrc;
  });

  floatingButton.addEventListener('mousedown', () => {
    img.src = pressedImgSrc;
  });

  floatingButton.addEventListener('mouseleave', () => {
    img.src = 'https://viume.yarsi.ai/assets/icons/ai_rest.png';
  });

  floatingButton.appendChild(img);

  // Toggle AI annotations when the button is clicked
  let aiAnnotationsVisible = false;

  floatingButton.addEventListener('click', () => {
    const annotationsToToggle = document.querySelectorAll('.ai-button');
    annotationsToToggle.forEach((annotation) => {
      annotation.style.display = aiAnnotationsVisible ? 'none' : 'inline';
    });

    aiAnnotationsVisible = !aiAnnotationsVisible;
  });

  return floatingButton;
}

function zoomFloatingButton() {
  const floatingButton = createElement('button', {
    class: 'floating-button',
    style: `
      position: fixed;
      top: 100px;
      left: 20px;
      background: transparent;
      border: none;
      cursor: pointer;
      z-index: 10000;
    `,
  });

  const img = createElement('img', {
    src: 'https://viume.yarsi.ai/assets/icons/zoomtool_rest.png',
    width: '50',
    height: '50',
  });

  const hoverImgSrc = 'https://viume.yarsi.ai/assets/icons/zoomtool_hover.png';
  const pressedImgSrc = 'https://viume.yarsi.ai/assets/icons/zoomtool_pressed.png';

  floatingButton.addEventListener('mouseenter', () => {
    img.src = hoverImgSrc;
  });

  floatingButton.addEventListener('mousedown', () => {
    img.src = pressedImgSrc;
  });

  floatingButton.addEventListener('mouseleave', () => {
    img.src = 'https://viume.yarsi.ai/assets/icons/zoomtool_rest.png';
  });

  floatingButton.appendChild(img);

  let aiAnnotationsVisible = false;

  floatingButton.addEventListener('click', () => {
    const annotationsToToggle = document.querySelectorAll('.zoom-button');
    annotationsToToggle.forEach((annotation) => {
      annotation.style.display = aiAnnotationsVisible ? 'none' : 'inline';
    });

    aiAnnotationsVisible = !aiAnnotationsVisible;
  });

  return floatingButton;
}

function filterFloatingIcon() {
  const floatingButton = createElement('button', {
    class: 'floating-button',
    style: `
      position: fixed;
      top: 100px;
      left: 70px;
      background: transparent;
      border: none;
      cursor: pointer;
      z-index: 10000;
    `,
  });

  const img = createElement('img', {
    src: 'https://viume.yarsi.ai/assets/icons/filter_rest.png',
    width: '50',
    height: '50',
  });

  const hoverImgSrc = 'https://viume.yarsi.ai/assets/icons/filter_hover.png';
  const pressedImgSrc = 'https://viume.yarsi.ai/assets/icons/filter_pressed.png';

  floatingButton.addEventListener('mouseenter', () => {
    img.src = hoverImgSrc;
  });

  floatingButton.addEventListener('mousedown', () => {
    img.src = pressedImgSrc;
  });

  floatingButton.addEventListener('mouseleave', () => {
    img.src = 'https://viume.yarsi.ai/assets/icons/filter_rest.png';
  });

  floatingButton.appendChild(img);

  // Toggle AI annotations when the button is clicked
  let aiAnnotationsVisible = false;

  floatingButton.addEventListener('click', () => {
    const annotationsToToggle = document.querySelectorAll('.filter-button');
    annotationsToToggle.forEach((annotation) => {
      annotation.style.display = aiAnnotationsVisible ? 'none' : 'inline';
    });

    aiAnnotationsVisible = !aiAnnotationsVisible;
  });

  return floatingButton;
}

function hideFloatingAnnotations() {
  const hideAnnotationsButton = createElement('button', {
    class: 'floating-button',
    style: `
      position: fixed;
      top: 100px;
      left: 120px;
      background: transparent;
      border: none;
      cursor: pointer;
      z-index: 10000;
    `,
  });

  const img = createElement('img', {
    src: 'https://viume.yarsi.ai/assets/icons/hide_rest.png',
    width: '50',
    height: '50',
  });

  const hoverImgSrc = 'https://viume.yarsi.ai/assets/icons/hide_hover.png';
  const pressedImgSrc = 'https://viume.yarsi.ai/assets/icons/hide_pressed.png';

  hideAnnotationsButton.addEventListener('mouseenter', () => {
    img.src = hoverImgSrc;
  });

  hideAnnotationsButton.addEventListener('mousedown', () => {
    img.src = pressedImgSrc;
  });

  hideAnnotationsButton.addEventListener('mouseleave', () => {
    img.src = 'https://viume.yarsi.ai/assets/icons/hide_rest.png';
  });

  hideAnnotationsButton.appendChild(img);

  let annotationsVisible = true;

  hideAnnotationsButton.addEventListener('click', () => {
    const annotationsToToggle = document.querySelectorAll('.a9s-annotation');
    annotationsToToggle.forEach((annotation) => {
      if (annotation.classList.contains('predict')) {
        annotation.style.display = 'none';
      } else {
        annotation.style.display = annotationsVisible ? 'none' : 'inline';
      }
    });

    annotationsVisible = !annotationsVisible;
  });

  return hideAnnotationsButton;
}

function initializeAnnotations(anno, viewer, info) {
  var currentPageIndex = viewer.currentPage();
  var currentTileSource = viewer.tileSources[currentPageIndex];
  var currentTileSourceUrl = currentTileSource.tilesUrl;

  anno.setAuthInfo({
    id: info.user._id,
    displayName: info.user.username,
  });

  fetchAndAddNewAnnotations(anno, info, viewer);

  Annotorious.SelectorPack(anno);
  Annotorious.TiltedBox(anno);
  Annotorious.Toolbar(anno, document.getElementById('span-toolbar'));
  Annotorious.BetterPolygon(anno);
}

window.addEventListener('message', async (event) => {
  const info = event.data?.info;

  if (info) {
    try {
      console.log(info.data);
      const data = await Promise.all(
        info.data.map((item) => fetchImageData(item.xmlUrl, item.tileUrl, item.zoomLevel))
      );
      const viewer = setupOpenSeadragonViewer(info, data);

      const buttonContainer = document.createElement('div');
      buttonContainer.id = 'button-container';
      document.getElementById('openseadragon-viewer').appendChild(buttonContainer);

      var formatter = function (annotation) {
        var tagBodies = annotation.bodies.filter(function (body) {
          return body.type === 'TextualBody' && body.purpose === 'tagging';
        });

        if (tagBodies.length > 0) {
          return tagBodies[0].value;
        }
      };

      var MyLabelFormatter = function (annotation) {
        var tagBodies = annotation.bodies.filter(function (body) {
          return body.type === 'TextualBody' && body.purpose === 'tagging';
        });

        if (tagBodies.length > 0) {
          const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
          foreignObject.innerHTML = `<label xmlns="http://www.w3.org/1999/xhtml" >${
            tagBodies[0].value.split(' ')[0]
          }</label>`;

          return {
            element: foreignObject,
          };
        }
      };

      var TagSelectorWidget = function (args) {
        var currentTagBody = args.annotation
          ? args.annotation.bodies.find(function (b) {
              return b.purpose === 'tagging';
            })
          : null;

        var currentTagValue = currentTagBody ? currentTagBody.value : null;

        var addTag = function (evt) {
          if (currentTagBody) {
            args.onUpdateBody(currentTagBody, {
              type: 'TextualBody',
              purpose: 'tagging',
              value: evt.target.dataset.tag,
            });
          } else {
            args.onAppendBody({
              type: 'TextualBody',
              purpose: 'tagging',
              value: evt.target.dataset.tag,
            });
          }
        };

        var createButton = function (value) {
          var button = document.createElement('button');

          if (value === currentTagValue) button.className = 'selected';

          button.dataset.tag = value;
          button.textContent = value;
          button.addEventListener('click', addTag);
          return button;
        };

        var container = document.createElement('div');
        container.className = 'tagselector-widget';

        var button1 = createButton('normal');
        var button2 = createButton('abnormal');

        container.appendChild(button1);
        container.appendChild(button2);

        return container;
      };

      const config = {
        annotationTarget: viewer.tileSources[0].tilesUrl,
        collectionName: 'annotations',
        formatters: [formatter, MyLabelFormatter],
        widgets: [{ widget: 'TAG', vocabulary: ['Normal', 'Abnormal', 'HSIL', 'LSIL', 'SCC'] }, 'COMMENT'],
      };

      const anno = OpenSeadragon.Annotorious(viewer, config);

      let defaultBool = false;
      const switchButton = createSwitchButton(viewer, info, anno, defaultBool);
      buttonContainer.appendChild(switchButton);

      const downloadButton = downloadAnnotationButton(viewer, info, data);
      buttonContainer.appendChild(downloadButton);
      initializeAnnotations(anno, viewer, info);

      const zoom50 = zoomTo50(viewer, info);
      buttonContainer.appendChild(zoom50);

      const zoom100 = zoomTo100(viewer, info);
      buttonContainer.appendChild(zoom100);

      const zoom10 = zoomTo10(viewer, info);
      buttonContainer.appendChild(zoom10);

      const sliderButton = createVerticalSlider(viewer);
      buttonContainer.appendChild(sliderButton);

      const { slider, filterValueButton } = createFilterSlider(viewer);
      buttonContainer.appendChild(slider);
      buttonContainer.appendChild(filterValueButton);

      buttonContainer.appendChild(createFloatingButton());
      buttonContainer.appendChild(zoomFloatingButton());
      buttonContainer.appendChild(filterFloatingIcon());
      buttonContainer.appendChild(hideFloatingAnnotations());

      viewer.addHandler('page', function (event) {
        console.log('Page changed to ' + event.page);
        console.log(event);
        // Reinitialize annotations
        fetchAndAddNewAnnotations(anno, info, event.eventSource);
      });
    } catch (error) {
      console.error('Error:', error);
    }
  }
});
