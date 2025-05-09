const Authentication = (function() {
    // This stores the current signed-in user
    let user = null;

    // This function gets the signed-in user
    const getUser = function() {
        return user;
    }

    // This function sends a sign-in request to the server
    // * `username`  - The username for the sign-in
    // * `password`  - The password of the user
    // * `onSuccess` - This is a callback function to be called when the
    //                 request is successful in this form `onSuccess()`
    // * `onError`   - This is a callback function to be called when the
    //                 request fails in this form `onError(error)`
    const signin = function(username, password, onSuccess, onError) {

        //
        // A. Preparing the user data
        //
        const data = {
            username:username,
            password:password
        }
        //
        
        // B. Sending the AJAX request to the server
        //
        fetch('/signin',{
            method:"POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        //
        // F. Processing any error returned by the server
        //
        .then(response => response.json())
        .then(json => {
            if (json.status === "success") {
                // H. Handling the success response from the server
                user = json.user; 
                if (onSuccess) onSuccess(user);
            } else if (onError) {
                onError(json.error);
            }
        })
        .catch(() => {
            if (onError) onError("Network error or server unreachable.");
        });
    };

    // This function sends a validate request to the server
    // * `onSuccess` - This is a callback function to be called when the
    //                 request is successful in this form `onSuccess()`
    // * `onError`   - This is a callback function to be called when the
    //                 request fails in this form `onError(error)`
    const validate = function(onSuccess, onError) {

        fetch('/validate', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        // C. Processing any error returned by the server
        .then(response => response.json())
        .then(json => {
            // E. Handling the success response from the server
            if (json.status === "success") {
                user = json.user; // store user in closure variable
                if (onSuccess) onSuccess();
            } else if (onError) {
                onError(json.error);
            }
        })
        .catch(() => {
            if (onError) onError("Network error or server unreachable.");
        });
    };

    // This function sends a sign-out request to the server
    // * `onSuccess` - This is a callback function to be called when the
    //                 request is successful in this form `onSuccess()`
    // * `onError`   - This is a callback function to be called when the
    //                 request fails in this form `onError(error)`
    const signout = function(onSuccess, onError) {
        fetch('/signout', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(json => {
            if (json.status === "success") {
                user = null; // reset closure variable user to null
                if (onSuccess) onSuccess();
            } else if (onError) {
                onError(json.error);
            }
        })
        .catch(() => {
            if (onError) onError("Network error or server unreachable.");
        });
    };
    

    return { getUser, signin, validate, signout };
})();
