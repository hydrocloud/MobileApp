import React from "react"

export default class EmptyNotice extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }
    
    render() {
        return (
            <div style={{textAlign: "center", fontSize: "14px", marginTop: "24px", color: "#7F7F7F"}}>{this.props.text}</div>
        );
    }
}