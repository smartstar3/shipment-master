class MockResponse {
    status (statusCode) {
        this.statusCode = statusCode;
        return this;
    }

    send (data) {
        this.data = data;
        return this;
    }

    json (data) {
        this.data = data;
        return this;
    }
}

module.exports = {
    MockResponse
};
