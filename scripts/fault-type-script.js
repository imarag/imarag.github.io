

// let intervalIDAnim;
// let imageFaultTypeAnimation = document.querySelector('#fault-type-animation');


// imageFaultTypeAnimation.addEventListener('mouseover', ()=>{
//   imageFaultTypeAnimation.src = '/images/fault-type-images/fault-type-animation.gif';
// });
// imageFaultTypeAnimation.addEventListener('mouseleave', ()=>{
//   imageFaultTypeAnimation.src = '/images/fault-type-images/fault-type-animation-start.jpg';
// });





// let intervalID;
// let counter = 1;
// let imageFault = document.querySelector('#image-id-fault');
// imageFault.addEventListener('mouseover', ()=>{startIntervalFunc('fault')});
// imageFault.addEventListener('mouseleave', endIntervalFunc);

// function startIntervalFunc(sourceTitle) 
// {
//   counter = 1;
//   if (sourceTitle === 'fault')
//   {
//     imageFault.src = '/images/fault-type-images/fault1.JPG';
//     intervalID = setInterval(()=>{change_picture_func(sourceTitle, 20)}, 150);
//   }
  
// }

// function endIntervalFunc()
// {

//     imageFault.src = '/images/fault-type-images/fault1.JPG';
//     clearInterval(intervalID);
// }

// function change_picture_func(sourceTitle, totalPictures)
// {
//   if (counter > totalPictures)
//   {
//     return
//   }

//   if (sourceTitle === 'fault')
//   {
//     let imagePath = `/images/fault-type-images/fault${counter}.JPG`;
//     imageFault.src = imagePath;
//   }
 
//   counter++;
// }
