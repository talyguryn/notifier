const ajax = require('codex.ajax');
const getFormData = require('get-form-data').default;

class Wbhkbot {
  static getForm() {
    let formElement = document.querySelector('form');
    let formObject = getFormData(formElement);

    return formObject;
  }

  sendForm() {
    let formObject = Wbhkbot.getForm();

    ajax.call({
      type: 'POST',
      url: '?',
      data: formObject,
      before: function () {},
      success: function (response) {
        console.log(response);
        // ...
      },
      error: function (response) {
        console.log(response);
        // ...
      },
      after: function () {},
    });
  };

  /**
   * Generates string for CURL request from command line
   *
   * @return {string}
   */
  generateCurl() {
    let formObject = Wbhkbot.getForm();
    let url = window.location.href;
    let curl = `curl -X POST ${url}`;

    /**
     * Add not empty params to $curl string
     */
    for (let key in formObject) {
      let value = formObject[key];

      if (value && value.length) {
        /**
         * Stringify value and remove string quotes (first and last elements)
         */
        let valueStringified = JSON.stringify(value).slice(1, -1);

        curl += ` -d '${key}=${valueStringified}'`;
      }
    }

    // /**
    //  * Hack! Escape exclamation mark for bash
    //  *
    //  * echo "hello"'!'
    //  */
    // curl = curl.replace('\'', '\\\'');

    console.log(curl);

    return curl;
  }
}

module.exports = new Wbhkbot();
