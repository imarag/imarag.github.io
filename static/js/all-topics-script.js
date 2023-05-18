
let mainElement = document.querySelector('#main-content');
let searchEntry = document.querySelector('#search');
let searchButton = document.querySelector('#search-bt');
let allTopicsObj = {};
let allExistingTopics = {};
let topicNotFound = null;
let allTopicsLength;


function addChildren(topicsObject) {

  let dummyListToSort = [];
  for (title in topicsObject) {
    dummyListToSort.push(title);
  }
  dummyListToSort.sort();

  for (title of dummyListToSort) {
    mainElement.appendChild(topicsObject[title])
  }
}


fetch('/all-topics-info.json')
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    allTopicsLength = data["all-topics"].length;
    for (let i=0; i<allTopicsLength; i++)
        {
            let singleTopic = data["all-topics"][i];
            let sectionElement = document.createElement('a');
            sectionElement.className = "created-element-anchor";
            sectionElement.href=`${singleTopic["page-url"]}`;
            sectionElement.innerHTML = `
                <div class="single-topic-div">
                  <p>${singleTopic["title"]}</p>
                  <img src="${singleTopic["image-url"]}" alt="sans" style="width: 300px; height: 220px;">
                </div>
                <hr class="hor-line">
            `;
         
            allTopicsObj[singleTopic["title"]] = sectionElement;
            allExistingTopics[singleTopic["title"]] = sectionElement;
        }
    
        addChildren(allTopicsObj);
    
  })
  .catch((error) => {
    console.error(`Could not get products: ${error}`);
  });


  searchButton.addEventListener("click", (event) => {
    if (topicNotFound) {
      mainElement.removeChild(topicNotFound);
      topicNotFound = null;
    }
    let entryText = searchEntry.value.toLowerCase();
    if (entryText) {
      newObject = {};
      let isSomethingFound = false;
      for (let titleTopic in allTopicsObj) {
            if (titleTopic.toLowerCase().includes(entryText)) {
              newObject[titleTopic] = allTopicsObj[titleTopic];
              isSomethingFound = true;
            }
      }

      for (elemTitle in allExistingTopics) {
        mainElement.removeChild(allExistingTopics[elemTitle]);
      }
      allExistingTopics = newObject;

      if (isSomethingFound) {
        addChildren(allExistingTopics);
      }
      else {
        topicNotFound = document.createElement('div');
        topicNotFound.innerHTML = `
            <div style="text-align: center">
              <p style="font-size: 40px;">Nothing found...</p>
              <img src="/static/img/all-topics-images/minions-no-bg.png" style="max-width: 100%; display: block; margin: auto; width: 400px; height: 300px;">
            </div>
        `;
        mainElement.appendChild(topicNotFound)
      }

      

      

    }

    else {
      for (elemTitle in allExistingTopics) {
        mainElement.removeChild(allExistingTopics[elemTitle]);
      }

      allExistingTopics = allTopicsObj;
      addChildren(allExistingTopics);
    }
  });