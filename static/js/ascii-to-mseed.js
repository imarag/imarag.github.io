

function handleFormSubmit(event) {
    event.preventDefault(); // Prevent form submission
  
    // Make a POST request to the server
    fetch('/create_stream', {
      method: 'POST',
    })
    .then(response => {
      // Check if the response is successful
      if (response.ok) {
        // Get the content disposition header to extract the filename
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition.split('filename=')[1];
  
        // Trigger the download
        response.blob().then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        });
      } else {
        // Handle error case
        console.log('Error:', response.statusText);
      }
    })
    .catch(error => {
      // Handle network or other errors
      console.log('Error:', error.message);
    });
  }